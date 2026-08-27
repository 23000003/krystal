import 'dotenv/config';
import { z } from 'zod';

const envParseResult = z
  .object({
    GEMINI_API_KEY: z
      .string('GEMINI_API_KEY is required')
      .min(1, 'GEMINI_API_KEY is required'),
    GEMINI_LLM_MODEL: z
      .string('GEMINI_LLM_MODEL is required')
      .min(1, 'GEMINI_LLM_MODEL is required'),
    GEMINI_TTS_MODEL: z
      .string('GEMINI_TTS_MODEL is required')
      .min(1, 'GEMINI_TTS_MODEL is required'),
    OPENROUTER_API_KEY: z
      .string('OPENROUTER_API_KEY is required')
      .min(1, 'OPENROUTER_API_KEY is required'),
    PORT: z.coerce.number().default(3001),
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
    LOG_LEVEL: z.string().optional(),
  })
  .safeParse({ ...process.env });

if (!envParseResult.success) {
  const issues = envParseResult.error.issues
    .map((issue) => `${issue.path.join('.')} — ${issue.message}`)
    .join('; ');
  console.error('[Error] Invalid environment variables:', issues);
  throw new Error(`Invalid environment variables: ${issues}`);
}

export const env = envParseResult.data;

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
