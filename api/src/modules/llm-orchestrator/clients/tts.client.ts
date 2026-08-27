import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import {
  OPENROUTER_SPEECH_URL,
  OPENROUTER_TTS_MODEL,
  TTS_VOICE,
} from '../../../config/constants';
import { env } from '../../../config/env';
import { SessionError } from '../../../common/session.error';
import { httpStatusOf } from '../../../common/describe-error';
import { createWavHeader, parseMimeType } from './utils/wav-utils';

const USE_GEMINI_TTS = false;

/** Base64 audio plus the type */
export type SynthesizedSpeech = {
  audio: string;
  mimeType: string;
};


function buildGeminiPrompt(text: string): string {
  return [
    "Read the following transcript based on the audio profile and director's note.",
    '',
    '# Audio Profile',
    'A clear and authoritative corporate trainer.',
    '',
    "# Director's note",
    'Style: Newscaster. Pace: Staccato. Accent: American (Gen).',
    '',
    '## Scene:',
    'A professional interview room setting',
    '',
    '## Transcript:',
    text,
  ].join('\n');
}

@Injectable()
export class TtsClient {
  private client?: GoogleGenAI;

  private getClient(): GoogleGenAI {
    this.client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    return this.client;
  }

  /** Speaks one interview question with whichever provider is selected. */
  synthesizeSpeech(text: string): Promise<SynthesizedSpeech> {
    return USE_GEMINI_TTS
      ? this.synthesizeWithGemini(text)
      : this.synthesizeWithOpenRouter(text);
  }

  /** OpenAI-compatible endpoint; the body is the audio, not JSON. */
  private async synthesizeWithOpenRouter(
    text: string,
  ): Promise<SynthesizedSpeech> {
    let response: Response;

    try {
      response = await fetch(OPENROUTER_SPEECH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'X-OpenRouter-Title': 'Krystal AI Interviewer',
        },
        body: JSON.stringify({
          model: OPENROUTER_TTS_MODEL,
          input: text,
          response_format: 'mp3',
          reference_id: 'model-id-bob',
          speed: 0.95,
          temperature: 0.7,
          top_p: 0.7,
        }),
      });
    } catch (cause) {
      throw new SessionError(
        'The speech service is unreachable.',
        502,
        'tts_unavailable',
        { cause },
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);

      if (response.status === 429) {
        throw new SessionError(
          'The speech service is rate limited. Check your OpenRouter usage.',
          429,
          'tts_rate_limited',
          { cause: detail },
        );
      }

      if (response.status === 402) {
        throw new SessionError(
          'The speech service is out of credits. Top up your OpenRouter account.',
          402,
          'tts_out_of_credits',
          { cause: detail },
        );
      }

      throw new SessionError(
        'The speech service rejected the request.',
        502,
        'tts_rejected',
        { cause: detail },
      );
    }

    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.length === 0) {
      throw new SessionError(
        'The speech service returned no audio.',
        502,
        'tts_empty_response',
      );
    }

    return {
      audio: audio.toString('base64'),
      mimeType: response.headers.get('content-type') ?? 'audio/mpeg',
    };
  }

  private async synthesizeWithGemini(text: string): Promise<SynthesizedSpeech> {
    let stream: Awaited<
      ReturnType<GoogleGenAI['models']['generateContentStream']>
    >;

    try {
      stream = await this.getClient().models.generateContentStream({
        model: env.GEMINI_TTS_MODEL,
        config: {
          temperature: 1,
          responseModalities: ['audio'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } },
          },
        },
        contents: [{ role: 'user', parts: [{ text: buildGeminiPrompt(text) }] }],
      });
    } catch (cause) {
      if (httpStatusOf(cause) === 429) {
        throw new SessionError(
          'The speech service quota is exhausted. Check your Gemini plan and billing.',
          429,
          'tts_rate_limited',
          { cause },
        );
      }
      throw new SessionError(
        'The speech service is unavailable right now.',
        502,
        'tts_unavailable',
        { cause },
      );
    }

    const chunks: Buffer[] = [];
    let mimeType = 'audio/L16;rate=24000';

    try {
      for await (const chunk of stream) {
        const part = chunk.candidates?.[0]?.content?.parts?.[0];
        if (!part?.inlineData?.data) continue;
        mimeType = part.inlineData.mimeType || mimeType;
        chunks.push(Buffer.from(part.inlineData.data, 'base64'));
      }
    } catch (cause) {
      throw new SessionError(
        'The speech service dropped mid-stream.',
        502,
        'tts_stream_failed',
        { cause },
      );
    }

    if (chunks.length === 0) {
      throw new SessionError(
        'The speech service returned no audio.',
        502,
        'tts_empty_response',
      );
    }

    const pcm = Buffer.concat(chunks);
    // Already a container format? Ship it as-is.
    const wav = mimeType.includes('wav')
      ? pcm
      : Buffer.concat([
          createWavHeader(pcm.length, parseMimeType(mimeType)),
          pcm,
        ]);

    return { audio: wav.toString('base64'), mimeType: 'audio/wav' };
  }
}
