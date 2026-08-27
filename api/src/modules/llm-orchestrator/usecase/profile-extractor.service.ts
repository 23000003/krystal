import { Injectable } from '@nestjs/common';
import { Type, type Schema } from '@google/genai';
import {
  candidateProfileSchema,
  type CandidateProfile,
} from '../../interview/types/interview.types';
import type { IProfileExtractor } from './interface/profile-extractor.interface';
import { GeminiClient } from '../clients/gen-ai.client';
import { buildProfileQuery } from './query-builder';

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    targetRole: { type: Type.STRING },
    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
    yearsOfExperience: { type: Type.NUMBER },
    education: { type: Type.STRING },
    keyExperience: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        organization: { type: Type.STRING },
        summary: { type: Type.STRING },
      },
      required: ['title', 'organization', 'summary'],
    },
  },
  required: [
    'name',
    'targetRole',
    'skills',
    'yearsOfExperience',
    'education',
    'keyExperience',
  ],
};

@Injectable()
export class ProfileExtractor implements IProfileExtractor {
  constructor(private readonly gemini: GeminiClient) {}
  extractProfile(resumeText: string): Promise<CandidateProfile> {
    return this.gemini.generateJson({
      ...buildProfileQuery(resumeText),
      responseSchema,
      schema: candidateProfileSchema,
      // Extraction should be near-deterministic.
      temperature: 0.1,
    });
  }
}
