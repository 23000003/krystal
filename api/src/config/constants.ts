export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MIN_TEXT_LENGTH = 50;

export const MINIMUM_NUMBER_OF_QUESTIONS = "5";
export const MAXIMUM_NUMBER_OF_QUESTIONS = "8";

export const TTS_VOICE = 'Achird';

export const OPENROUTER_SPEECH_URL =
  process.env.OPENROUTER_SPEECH_URL ??
  'https://openrouter.ai/api/v1/audio/speech';

export const OPENROUTER_TTS_MODEL = 'fish-audio/s2.1-pro-free:free';

export const TRANSCRIBER_MODEL = 'qwen/qwen3-asr-1.7b';

export const OPENROUTER_TRANSCRIPTION_URL =
  process.env.OPENROUTER_TRANSCRIPTION_URL ??
  'https://openrouter.ai/api/v1/audio/transcriptions';

export const WS_PATH = '/ws/interview';
export const INITIAL_AUDIO_BATCH = 2;
export const AUDIO_BATCH_DELAY_MS = 3_500;
