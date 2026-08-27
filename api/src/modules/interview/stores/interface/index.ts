import { AudioQueueStore } from '../audio-queue.store';
import { SessionStore } from '../session.store';
import { IAudioQueueStoreToken } from './audio-queue-store.interface';
import { ISessionStoreToken } from './session-store.interface';

export const IStoreInterfaces = [
  {
    provide: ISessionStoreToken,
    useClass: SessionStore,
  },
  {
    provide: IAudioQueueStoreToken,
    useClass: AudioQueueStore,
  },
];
