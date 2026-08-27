import { Inject } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { WebSocket } from 'ws';
import {
  AUDIO_BATCH_DELAY_MS,
  INITIAL_AUDIO_BATCH,
  WS_PATH,
} from '../../../config/constants';
import { AppLogger } from '../../../common/app-logger';
import { SessionError } from '../../../common/session.error';
import { describeError } from '../../../common/describe-error';
import {
  IAudioQueueStoreToken,
  type IAudioQueueStore,
} from '../stores/interface/audio-queue-store.interface';
import {
  IInterviewLoopServiceToken,
  type IInterviewLoopService,
} from '../usecase/interface/interview-loop.interface';
import {
  ISessionStoreToken,
  type ISessionStore,
} from '../stores/interface/session-store.interface';
import type { ClientMessage, ServerMessage } from '../types/socket.types';

/** Per-connection state: how far the queue has been released to this client. */
type Connection = {
  sessionId: string | null;
  /** Questions pushed so far, which doubles as the next index to send. */
  sentCount: number;
  /** Ceiling on `sentCount`. Opens by one per ack delay and per answer. */
  unlocked: number;
  /** Answers received, whether or not their transcription has finished. */
  answeredCount: number;
  /** Transcriptions still running, so the session can wait them out at the end. */
  pending: Set<Promise<unknown>>;
  batchTimer?: ReturnType<typeof setTimeout>;
  closed: boolean;
};

/**
 * The interview socket. Messages keep a flat `{ type, ... }` shape rather than
 * Nest's `{ event, data }` envelope, because most traffic here is server-pushed
 * rather than request/response. Nest's own router ignores what it can't match.
 */
@WebSocketGateway({ path: WS_PATH })
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new AppLogger('interview-ws');
  private readonly connections = new WeakMap<WebSocket, Connection>();

  constructor(
    @Inject(IInterviewLoopServiceToken)
    private readonly loop: IInterviewLoopService,
    @Inject(IAudioQueueStoreToken)
    private readonly queues: IAudioQueueStore,
    @Inject(ISessionStoreToken)
    private readonly sessions: ISessionStore,
  ) {}

  handleConnection(socket: WebSocket) {
    const connection: Connection = {
      sessionId: null,
      sentCount: 0,
      unlocked: 0,
      answeredCount: 0,
      pending: new Set(),
      closed: false,
    };
    this.connections.set(socket, connection);
    this.logger.debug('Client connected', {
      sessionId: connection.sessionId ?? undefined,
    });

    socket.on('message', (raw: Buffer | string) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        this.send(socket, {
          type: 'error',
          message: 'Malformed message.',
          code: 'bad_message',
        });
        return;
      }

      // Ignore anything that isn't ours — Nest's router may also see it.
      if (!message?.type) return;

      this.handleMessage(socket, connection, message).catch((error) =>
        this.fail(socket, error),
      );
    });
  }

  handleDisconnect(socket: WebSocket) {
    const connection = this.connections.get(socket);
    if (!connection) return;
    connection.closed = true;
    clearTimeout(connection.batchTimer);
    this.logger.debug('Client disconnected', {
      sessionId: connection.sessionId ?? undefined,
    });
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState !== socket.OPEN) return;
    socket.send(JSON.stringify(message));
  }

  private fail(socket: WebSocket, error: unknown): void {
    if (error instanceof SessionError) {
      this.send(socket, {
        type: 'error',
        message: error.message,
        code: error.code,
      });
      return;
    }
    this.logger.error('Socket handler failed', describeError(error));
    this.send(socket, {
      type: 'error',
      message: 'Something went wrong during the interview.',
      code: 'internal_error',
    });
  }

  /**
   * Pushes one question audio when the client is allowed another and the TTS for
   * it has landed. Returns false when neither is true.
   */
  private pushNext(socket: WebSocket, connection: Connection): boolean {
    const { sessionId } = connection;
    if (!sessionId || connection.closed) return false;
    if (connection.sentCount >= connection.unlocked) return false;

    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Questions go out in bank order, so `sentCount` is also the next index.
    const index = connection.sentCount;
    const question = session.questionBank[index];
    if (!question) return false;

    const item = this.queues.get(sessionId, question.id);
    if (!item || item.status === 'pending') return false;

    connection.sentCount += 1;
    this.queues.update(sessionId, question.id, { status: 'sent' });

    this.send(socket, {
      type: 'audio:question',
      questionId: question.id,
      index,
      total: session.questionBank.length,
      question: question.question,
      topic: question.topic,
      audio: item.audio,
      audioMimeType: item.mimeType,
    });

    return true;
  }

  /** Sends every question the client is currently entitled to. */
  private drain(socket: WebSocket, connection: Connection): void {
    this.logger.debug('Draining audio queue', {
      sessionId: connection.sessionId ?? undefined,
      sentCount: connection.sentCount,
      unlocked: connection.unlocked,
    });
    while (this.pushNext(socket, connection)) {
      this.logger.debug("Pushed Question audio.");
      // keep going
    }
  }

  /** Opens the gate by one after the batch delay, per the ticket's pacing rule. */
  private scheduleNext(socket: WebSocket, connection: Connection): void {
    clearTimeout(connection.batchTimer);
    connection.batchTimer = setTimeout(() => {
      if (connection.closed) return;
      connection.unlocked += 1;
      this.drain(socket, connection);
    }, AUDIO_BATCH_DELAY_MS);
  }

  // The interview socket is a single long-lived connection, so the client must
  // send a "session:start" message to begin the interview. The server then
  // pushes questions and receives answers over the same connection.
  private async handleMessage(
    socket: WebSocket,
    connection: Connection,
    message: ClientMessage,
  ): Promise<void> {
    switch (message.type) {
      case 'session:start': {
        const session = this.sessions.get(message.sessionId);
        if (!session) {
          throw new SessionError('Session not found.', 404, 'session_not_found');
        }

        // Already scored (or already answered through): send them onward
        // instead of replaying the interview.
        if (session.status === 'completed') {
          connection.sessionId = message.sessionId;
          this.send(socket, {
            type: 'session:end',
            sessionId: message.sessionId,
          });
          return;
        }

        connection.sessionId = message.sessionId;
        connection.sentCount = 0;
        connection.unlocked = INITIAL_AUDIO_BATCH;
        connection.answeredCount = session.conversationHistory.length;
        this.sessions.update(message.sessionId, { status: 'in-progress' });

        this.send(socket, {
          type: 'session:ready',
          sessionId: message.sessionId,
          questions: session.questionBank,
          answered: session.conversationHistory.map((turn) => turn.questionId),
        });

        // Synthesis runs in the background; each finished item releases
        // whatever the client is already entitled to.
        void this.loop
          .primeAudioQueue(message.sessionId, () =>
            this.drain(socket, connection),
          )
          .catch((error) => this.fail(socket, error));

        return;
      }

      case 'audio:ack': {
        // Receipt confirmed — pace the next one out after the delay.
        this.scheduleNext(socket, connection);
        return;
      }

      case 'audio:answer': {
        const { sessionId } = connection;
        if (!sessionId) {
          throw new SessionError(
            'Send session:start before answering.',
            400,
            'session_not_started',
          );
        }

        // Validate and claim the slot up front so duplicates still fail fast.
        const question = this.loop.reserveAnswer(sessionId, message.questionId);
        connection.answeredCount += 1;

        const total = this.sessions.get(sessionId)?.questionBank.length ?? 0;

        // Transcription runs in the background — the candidate should not wait
        // on an ASR round trip to hear the next question.
        const task = this.loop
          .transcribeAnswer(sessionId, question, message.audio)
          .then((turn) => {
            this.send(socket, {
              type: 'transcript:save',
              questionId: turn.questionId,
              answer: turn.answer,
              answered:
                this.sessions.get(sessionId)?.conversationHistory.length ?? 0,
              total,
            });
          })
          .catch((error) => this.fail(socket, error))
          .finally(() => connection.pending.delete(task));

        connection.pending.add(task);

        if (connection.answeredCount >= total) {
          // Last answer: let the stragglers land before closing the session.
          await Promise.allSettled([...connection.pending]);
          this.loop.finish(sessionId);
          // Scoring runs while the conclusion audio plays.
          void this.loop.generateReport(sessionId);
          this.send(socket, { type: 'session:end', sessionId });
          return;
        }

        // Release the next question straight away.
        connection.unlocked += 1;
        this.drain(socket, connection);
        return;
      }
    }
  }
}
