import { randomUUID } from 'node:crypto';
import {
  IProfileExtractorToken,
  type IProfileExtractor,
} from '../../llm-orchestrator/usecase/interface/profile-extractor.interface';
import {
  IQuestionGeneratorToken,
  type IQuestionGenerator,
} from '../../llm-orchestrator/usecase/interface/question-generator.interface';
import type { IInterviewSessionService } from './interface/interview-session.interface';
import { Inject, Injectable } from '@nestjs/common';
import { AppLogger } from '../../../common/app-logger';
import type {
  CandidateProfile,
  InterviewQuestion,
  SessionState,
} from '../types/interview.types';
import {
  MOCK_CANDIDATE_PROFILE,
  MOCK_QUESTION_BANK,
} from '../mocks/question-bank.mock';
import {
  ResumeParserService,
  type UploadedResume,
} from '../../resume/resume-parser.service';
import {
  ISessionStoreToken,
  type ISessionStore,
} from '../stores/interface/session-store.interface';

/**
 * Skips resume parsing and both Gemini setup calls, serving the recorded
 * question bank instead.
 */
export const USE_MOCK_SESSION = false;

@Injectable()
export class InterviewSessionService implements IInterviewSessionService {
  private readonly logger = new AppLogger('interview-session');

  constructor(
    private readonly resumeParser: ResumeParserService,
    @Inject(IProfileExtractorToken)
    private readonly profileExtractor: IProfileExtractor,
    @Inject(IQuestionGeneratorToken)
    private readonly questionGenerator: IQuestionGenerator,
    @Inject(ISessionStoreToken)
    private readonly sessions: ISessionStore,
  ) {}

  private buildSession(
    candidate: CandidateProfile,
    questionBank: InterviewQuestion[],
  ): SessionState {
    return {
      sessionId: randomUUID(),
      candidate,
      questionBank,
      currentQuestionIndex: 0,
      conversationHistory: [],
      status: 'ready',
      createdAt: new Date().toISOString(),
    };
  }

  async startInterviewSession(file: UploadedResume): Promise<SessionState> {
    this.logger.info('Starting interview session', {
      fileName: file.originalname,
      bytes: file.size,
    });

    // skips parsing and both Gemini calls entirely.
    if (USE_MOCK_SESSION) {
      const mocked = this.buildSession(
        MOCK_CANDIDATE_PROFILE,
        MOCK_QUESTION_BANK,
      );
      this.sessions.save(mocked);
      this.logger.warn('Using mock question bank', {
        sessionId: mocked.sessionId,
        questions: mocked.questionBank.length,
      });
      return mocked;
    }

    const resumeText = await this.resumeParser.parseResume(file);
    this.logger.debug('Resume parsed', { characters: resumeText.length });

    const candidate = await this.profileExtractor.extractProfile(resumeText);
    
    this.logger.debug('Profile extracted', {
      targetRole: candidate.targetRole,
      skills: candidate.skills.length,
    });

    const questionBank = await this.questionGenerator.generateQuestionBank(candidate);

    const session = this.buildSession(candidate, questionBank);
    this.sessions.save(session);

    this.logger.info('Session ready', {
      sessionId: session.sessionId,
      questions: questionBank.length,
    });

    return session;
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }
}
