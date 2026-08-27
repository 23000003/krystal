import type {
  CandidateProfile,
  ConversationTurn,
  InterviewReport,
} from '../../../interview/types/interview.types';

export const IResultGeneratorToken = 'IResultGenerator';

export interface IResultGenerator {
  /**
   * transcript + profile to evaluation report.
   *
   * The candidate block is assembled here rather than asked for, so the name,
   * role, and years of experience come from the stored profile and cannot be
   * hallucinated.
   */
  generateResult(profile: CandidateProfile, transcript: ConversationTurn[]): Promise<InterviewReport>;
}
