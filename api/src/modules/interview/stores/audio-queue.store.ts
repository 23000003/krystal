import { Injectable } from '@nestjs/common';
import type { IAudioQueueStore } from './interface/audio-queue-store.interface';
import type { AudioQueueItem } from '../types/socket.types';

/** TTS output for a session's question bank, keyed by sessionId then questionId. */
@Injectable()
export class AudioQueueStore implements IAudioQueueStore {
  private readonly queues = new Map<string, Map<string, AudioQueueItem>>();

  init(sessionId: string, questionIds: string[]): AudioQueueItem[] {
    const queue = new Map<string, AudioQueueItem>(
      questionIds.map((questionId) => [
        questionId,
        {
          questionId,
          sessionId,
          audio: null,
          mimeType: null,
          status: 'pending' as const,
        },
      ]),
    );
    this.queues.set(sessionId, queue);
    return [...queue.values()];
  }

  get(sessionId: string, questionId: string): AudioQueueItem | undefined {
    return this.queues.get(sessionId)?.get(questionId);
  }

  list(sessionId: string): AudioQueueItem[] {
    return [...(this.queues.get(sessionId)?.values() ?? [])];
  }

  update(
    sessionId: string,
    questionId: string,
    patch: Partial<Omit<AudioQueueItem, 'questionId' | 'sessionId'>>,
  ): AudioQueueItem | undefined {
    const item = this.queues.get(sessionId)?.get(questionId);
    if (!item) return undefined;
    Object.assign(item, patch);
    return item;
  }

  clear(sessionId: string): void {
    this.queues.delete(sessionId);
  }
}
