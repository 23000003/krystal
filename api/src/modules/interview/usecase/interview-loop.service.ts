import {
  IResultGeneratorToken,
  type IResultGenerator,
} from '../../llm-orchestrator/usecase/interface/result-generator.interface';
import type { IInterviewLoopService } from './interface/interview-loop.interface';
import { Inject, Injectable } from '@nestjs/common';
import { AppLogger } from '../../../common/app-logger';
import { SessionError } from '../../../common/session.error';
import { describeError } from '../../../common/describe-error';
import { TtsClient } from '../../llm-orchestrator/clients/tts.client';
import { TranscriberClient } from '../../llm-orchestrator/clients/transcriber.client';
import {
  IAudioQueueStoreToken,
  type IAudioQueueStore,
} from '../stores/interface/audio-queue-store.interface';
import type { ConversationTurn, InterviewQuestion } from '../types/interview.types';
import type { AudioQueueItem } from '../types/socket.types';
import {
  ISessionStoreToken,
  type ISessionStore,
} from '../stores/interface/session-store.interface';

@Injectable()
export class InterviewLoopService implements IInterviewLoopService {
  private readonly logger = new AppLogger('interview-loop');

  constructor(
    private readonly tts: TtsClient,
    private readonly transcriber: TranscriberClient,
    @Inject(IAudioQueueStoreToken)
    private readonly queues: IAudioQueueStore,
    @Inject(ISessionStoreToken)
    private readonly sessions: ISessionStore,
    @Inject(IResultGeneratorToken)
    private readonly resultGenerator: IResultGenerator,
  ) {}

  async primeAudioQueue(sessionId: string, onReady: (item: AudioQueueItem) => void): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionError('Session not found.', 404, 'session_not_found');
    }

    this.queues.init(
      sessionId,
      session.questionBank.map((question) => question.id),
    );

    for (const question of session.questionBank) {

      // The candidate may have hung up while we were synthesising.
      if (!this.queues.get(sessionId, question.id)) return;

      try {
        const { audio, mimeType } = await this.tts.synthesizeSpeech(
          question.question,
        );
        const item = this.queues.update(sessionId, question.id, {
          audio,
          mimeType,
          status: 'ready',
        });

        this.logger.info('Question TTS ready', {
          sessionId,
          questionId: question.id,
          characters: question.question.length,
        });

        if (item) onReady(item);
      } catch (error) {
        this.logger.error('Question TTS failed', {
          sessionId,
          questionId: question.id,
          ...describeError(error),
        });

        const item = this.queues.update(sessionId, question.id, {
          status: 'failed',
        });
        // The candidate may have hung up while we were synthesising.
        if (item) onReady(item);
      }
    }
  }

  reserveAnswer(sessionId: string, questionId: string): InterviewQuestion {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionError('Session not found.', 404, 'session_not_found');
    }

    const question = session.questionBank.find((item) => item.id === questionId);
    if (!question) {
      throw new SessionError(
        'That question is not part of this session.',
        400,
        'unknown_question',
      );
    }

    if (this.queues.get(sessionId, questionId)?.status === 'answered') {
      throw new SessionError(
        'That question has already been answered.',
        409,
        'duplicate_answer',
      );
    }

    this.queues.update(sessionId, questionId, { status: 'answered' });
    return question;
  }

  async transcribeAnswer(
    sessionId: string,
    question: InterviewQuestion,
    base64Wav: string,
  ): Promise<ConversationTurn> {
    const answer = await this.transcriber.transcribeAudio(base64Wav);

    const turn: ConversationTurn = {
      questionId: question.id,
      question: question.question,
      answer,
      timestamp: new Date().toISOString(),
    };

    this.sessions.upsertTurn(sessionId, turn);

    this.logger.info('Answer transcribed', {
      sessionId,
      questionId: question.id,
      characters: answer.length,
      answer: answer.slice(0, 50),
    });

    return turn;
  }

  finish(sessionId: string): void {
    this.sessions.update(sessionId, { status: 'completed' });
    this.queues.clear(sessionId);
    this.logger.info('Interview complete', { 
      sessionId,
      questions: this.sessions.get(sessionId)?.questionBank,
      totalAnswered: this.sessions.get(sessionId)?.conversationHistory,
    });
  }

  async generateReport(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.report) return;

    try {
      const report = await this.resultGenerator.generateResult(
        session.candidate,
        session.conversationHistory,
      );
      this.sessions.setReport(sessionId, report);
      this.logger.info('Report generated', {
        sessionId,
        technical: report.technicalCompetencies.length,
        behavioral: report.behavioralCompetencies.length,
      });
    } catch (error) {
      this.logger.error('Report generation failed', {
        sessionId,
        ...describeError(error),
      });
    }
  }
}
