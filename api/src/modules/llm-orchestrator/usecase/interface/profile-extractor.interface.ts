import type { CandidateProfile } from '../../../interview/types/interview.types';

export const IProfileExtractorToken = 'IProfileExtractor';

export interface IProfileExtractor {
  /** Raw resume text to structured candidate profile. */
  extractProfile(resumeText: string): Promise<CandidateProfile>;
}
