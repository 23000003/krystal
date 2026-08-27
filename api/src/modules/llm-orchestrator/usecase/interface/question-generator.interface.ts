import type {
  CandidateProfile,
  InterviewQuestion,
} from '../../../interview/types/interview.types';

export const IQuestionGeneratorToken = 'IQuestionGenerator';

export interface IQuestionGenerator {
  /** Candidate profile to opening question bank. */
  generateQuestionBank(profile: CandidateProfile): Promise<InterviewQuestion[]>;
}
