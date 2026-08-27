import {
  Controller,
  Inject,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ok, type ApiResponse } from '../../../common/api-response';
import { SessionError } from '../../../common/session.error';
import type {
  CreateSessionResponse,
  InterviewReport,
  SessionState,
} from '../types/interview.types';
import type { UploadedResume } from '../../resume/resume-parser.service';
import {
  IInterviewSessionServiceToken,
  type IInterviewSessionService,
} from '../usecase/interface/interview-session.interface';

@Controller('session')
export class InterviewController {
  constructor(
    @Inject(IInterviewSessionServiceToken)
    private readonly sessionService: IInterviewSessionService,
  ) {}

  /** Session setup. */
  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('resume'))
  async createSession(@UploadedFile() resume?: UploadedResume): Promise<ApiResponse<CreateSessionResponse>> {
    if (!resume || resume.size === 0) {
      throw new SessionError(
        'No resume file was uploaded.',
        400,
        'missing_resume',
      );
    }

    const session = await this.sessionService.startInterviewSession(resume);

    return ok(
      {
        sessionId: session.sessionId,
        profile: session.candidate,
        questionBank: session.questionBank,
      },
      'Your interview is ready.',
    );
  }

  @Get()
  getSession(@Query('id') id?: string): ApiResponse<SessionState> {
    if (!id) {
      throw new SessionError('Missing `id` parameter.', 400, 'missing_id');
    }

    const session = this.sessionService.getSession(id);
    if (!session) {
      throw new SessionError('Session not found.', 404, 'session_not_found');
    }

    return ok(session, 'Session found.');
  }

  /**
   * The evaluation report.
   * Scoring starts when the interview ends and runs in the background, so a
   * request that arrives first gets 202 and the client retries.
   */
  @Get(':id/result')
  getResult(@Param('id') id: string): ApiResponse<InterviewReport> {
    const session = this.sessionService.getSession(id);
    if (!session) {
      throw new SessionError('Session not found.', 404, 'session_not_found');
    }

    if (!session.report) {
      throw new SessionError(
        session.status === 'completed'
          ? 'Your report is still being written.'
          : 'This interview is not finished yet.',
        202,
        'report_pending',
      );
    }

    return ok(session.report, 'Report ready.');
  }
}
