import type {
  ConversationTurn,
  InterviewQuestion,
} from '../../types/interview.types';
import type { AudioQueueItem } from '../../types/socket.types';

export const IInterviewLoopServiceToken = 'IInterviewLoopService';

/** The live interview: question audio, answers, transcript, and scoring. */
export interface IInterviewLoopService {
  
  /**
   * Builds the TTS queue for a session. Generation is sequential so the earliest
   * questions are ready first, `onReady` fires per item so the socket can push
   * audio out as it lands instead of waiting for the whole bank.
   */
  primeAudioQueue(
    sessionId: string,
    onReady: (item: AudioQueueItem) => void,
  ): Promise<void>;

  /** Claims a question synchronously so duplicate answers fail fast. */
  reserveAnswer(sessionId: string, questionId: string): InterviewQuestion;

  /**
   * Runs the transcription and files it under the right question. Called
   * without awaiting, so the candidate hears the next question while this is
   * still in flight.
   */
  transcribeAnswer(
    sessionId: string,
    question: InterviewQuestion,
    base64Wav: string,
  ): Promise<ConversationTurn>;

  finish(sessionId: string): void;

  /**
   * Scores the interview. Called without awaiting so `session:end` — and the
   * conclusion audio — are not held up behind an LLM round trip; the results
   * page polls until the report lands.
   */
  generateReport(sessionId: string): Promise<void>;
}
