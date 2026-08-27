import type { AudioQueueItem } from '../../types/socket.types';

export const IAudioQueueStoreToken = 'IAudioQueueStore';

/** TTS output for a session's question bank, keyed by sessionId then questionId. */
export interface IAudioQueueStore {

  /** Creates the pending queue for a session, replacing any earlier attempt. */
  init(sessionId: string, questionIds: string[]): AudioQueueItem[];
  get(sessionId: string, questionId: string): AudioQueueItem | undefined;
  list(sessionId: string): AudioQueueItem[];
  update(
    sessionId: string,
    questionId: string,
    patch: Partial<Omit<AudioQueueItem, 'questionId' | 'sessionId'>>,
  ): AudioQueueItem | undefined;
  clear(sessionId: string): void;
}
