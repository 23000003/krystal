import { Injectable } from '@nestjs/common';
import { GoogleGenAI, type Schema } from '@google/genai';
import type { z } from 'zod';
import { env } from '../../../config/env';
import { SessionError } from '../../../common/session.error';
import { httpStatusOf } from '../../../common/describe-error';

/**
 * Structured-JSON calls to Gemini. `responseSchema` steers the model, but the
 * Zod `schema` is the authority — a response that fails it is an error, not
 * something to pass downstream.
 */
@Injectable()
export class GeminiClient {
  private client?: GoogleGenAI;

  private getClient(): GoogleGenAI {
    this.client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    return this.client;
  }

  async generateJson<T>({
    systemInstruction,
    prompt,
    responseSchema,
    schema,
    temperature = 0.4,
  }: {
    systemInstruction: string;
    prompt: string;
    // The schema that the model is instructed to produce.
    responseSchema: Schema;
    // The Zod schema that the output is validated against. 
    schema: z.ZodType<T>;
    temperature?: number;
  }): Promise<T> {
    let text: string | undefined;

    try {
      const response = await this.getClient().models.generateContent({
        model: env.GEMINI_LLM_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          temperature,
        },
      });
      text = response.text;
    } catch (cause) {
      if (httpStatusOf(cause) === 429) {
        throw new SessionError(
          'The AI service quota is exhausted. Check your Gemini plan and billing.',
          429,
          'llm_rate_limited',
          { cause },
        );
      }
      throw new SessionError(
        'The AI service is unavailable right now. Please try again.',
        502,
        'llm_unavailable',
        { cause },
      );
    }

    if (!text) {
      throw new SessionError(
        'The AI service returned an empty response.',
        502,
        'llm_empty_response',
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (cause) {
      throw new SessionError(
        'The AI service returned malformed JSON.',
        502,
        'llm_malformed_json',
        { cause },
      );
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new SessionError(
        'The AI service returned data in an unexpected shape.',
        502,
        'llm_unexpected_shape',
        { cause: result.error },
      );
    }

    return result.data;
  }
}
