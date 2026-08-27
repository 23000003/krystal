import { Injectable } from '@nestjs/common';
import {
  OPENROUTER_TRANSCRIPTION_URL,
  TRANSCRIBER_MODEL,
} from '../../../config/constants';
import { env } from '../../../config/env';
import { SessionError } from '../../../common/session.error';

@Injectable()
export class TranscriberClient {
  /** Transcribes a base64 WAV answer */
  async transcribeAudio(base64Wav: string): Promise<string> {
    let response: Response;

    try {
      response = await fetch(OPENROUTER_TRANSCRIPTION_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'X-OpenRouter-Title': 'Krystal AI Interviewer',
        },
        body: JSON.stringify({
          model: TRANSCRIBER_MODEL,
          input_audio: { data: base64Wav, format: 'wav' },
        }),
      });
    } catch (cause) {
      throw new SessionError(
        'The transcription service is unreachable.',
        502,
        'stt_unavailable',
        { cause },
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);

      if (response.status === 429) {
        throw new SessionError(
          'The transcription service is rate limited. Check your OpenRouter usage.',
          429,
          'stt_rate_limited',
          { cause: detail },
        );
      }

      // OpenRouter answers 402 when the account is out of credits.
      if (response.status === 402) {
        throw new SessionError(
          'The transcription service is out of credits. Top up your OpenRouter account.',
          402,
          'stt_out_of_credits',
          { cause: detail },
        );
      }

      throw new SessionError(
        'The transcription service rejected the recording.',
        502,
        'stt_rejected',
        { cause: detail },
      );
    }

    const result = (await response.json().catch(() => null)) as {
      text?: string;
    } | null;

    if (typeof result?.text !== 'string') {
      throw new SessionError(
        'The transcription service returned no text.',
        502,
        'stt_empty_response',
      );
    }

    return result.text.trim();
  }
}
