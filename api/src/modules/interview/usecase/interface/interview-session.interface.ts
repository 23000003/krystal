import type { SessionState } from '../../types/interview.types';
import type { UploadedResume } from '../../../resume/resume-parser.service';

/**
 * Token for dependency injection of the interview session service.
 */
export const IInterviewSessionServiceToken = 'IInterviewSessionService';

/** Session setup: resume in, stored session out. */
export interface IInterviewSessionService {

  /**
   * Session setup: parse the resume, extract a profile, generate the opening
   * question bank, then store the initial session state.
   */
  startInterviewSession(file: UploadedResume): Promise<SessionState>;
  getSession(sessionId: string): SessionState | undefined;
}
