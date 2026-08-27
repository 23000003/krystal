import type {
  ConversationTurn,
  InterviewReport,
  SessionState,
} from '../../types/interview.types';

export const ISessionStoreToken = 'ISessionStore';

export interface ISessionStore {
  save(session: SessionState): SessionState;
  get(sessionId: string): SessionState | undefined;
  count(): number;
  setReport(sessionId: string, report: InterviewReport): void;

  /** Applies a patch in place and returns the updated session. */
  update(sessionId: string, patch: Partial<Omit<SessionState, 'sessionId'>>): SessionState | undefined;
  /**
   * Writes one answered question into the transcript at its question-bank
   * position. Transcriptions finish out of order — a short answer can overtake
   * a long one — so appending would scramble the order.
   */
  upsertTurn(sessionId: string, turn: ConversationTurn): SessionState | undefined;
}
