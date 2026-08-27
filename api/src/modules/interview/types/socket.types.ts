import type { InterviewQuestion } from './interview.types';

/**
 * Wire protocol for the interview socket. Mirrored on the client in
 * `features/shared/types/interview-socket.ts` - keep the two in step.
 */

/** Messages the browser sends. */
export type ClientMessage =
  | { type: 'session:start'; sessionId: string }
  /** Receipt for a question audio, which paces the next batch. */
  | { type: 'audio:ack'; questionId: string }
  /** Base64 WAV of the candidate's answer. */
  | { type: 'audio:answer'; questionId: string; audio: string };

/** Messages the interview socket sends back. */
export type ServerMessage =
  | {
      type: 'session:ready';
      sessionId: string;
      questions: InterviewQuestion[];
      answered: string[];
    }
  | {
      type: 'audio:question';
      questionId: string;
      index: number;
      total: number;
      question: string;
      topic: string;
      /** Base64 audio, or null when TTS failed and the client falls back to text. */
      audio: string | null;
      /** What `audio` actually is — providers differ (wav vs mpeg). */
      audioMimeType: string | null;
    }
  | {
      type: 'transcript:save';
      questionId: string;
      answer: string;
      answered: number;
      total: number;
    }
  | { type: 'session:end'; sessionId: string }
  | { type: 'error'; message: string; code: string };

export type QueueItemStatus =
  | 'pending'
  | 'ready'
  | 'sent'
  | 'answered'
  | 'failed';

/** Server-side TTS queue entry, one per question. */
export type AudioQueueItem = {
  questionId: string;
  sessionId: string;
  audio: string | null;
  mimeType: string | null;
  status: QueueItemStatus;
};
