import { Injectable } from '@nestjs/common';
import { Type, type Schema } from '@google/genai';
import type { BehavioralCompetency } from '../../interview/types/interview.types';
import {
  evaluationSchema,
  type CandidateProfile,
  type ConversationTurn,
  type InterviewReport,
} from '../../interview/types/interview.types';
import { AppLogger } from '../../../common/app-logger';
import type { IResultGenerator } from './interface/result-generator.interface';
import { GeminiClient } from '../clients/gen-ai.client';
import { buildEvaluationQuery } from './query-builder';

const STATUSES = ['Strong', 'Adequate', 'Gap', 'Gap — [HIGH]'];

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    technicalCompetencies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          competency: { type: Type.STRING },
          evidence: { type: Type.STRING },
          bar: { type: Type.STRING },
          status: { type: Type.STRING, enum: STATUSES },
        },
        required: ['competency', 'evidence', 'bar', 'status'],
      },
    },
    behavioralCompetencies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          competency: { type: Type.STRING },
          evidence: { type: Type.STRING },
          status: { type: Type.STRING, enum: STATUSES },
        },
        required: ['competency', 'evidence', 'status'],
      },
    },
  },
  required: ['technicalCompetencies', 'behavioralCompetencies'],
};

const COMMUNICATION = 'Communication';

/**
 * Ensures that the Communication competency is always present
 */
function ensureCommunication(rows: BehavioralCompetency[]): { rows: BehavioralCompetency[]; backfilled: boolean } {
  const index = rows.findIndex(
    (row) => row.competency.trim().toLowerCase() === COMMUNICATION.toLowerCase(),
  );

  if (index === 0) return { rows, backfilled: false };

  if (index > 0) {
    const reordered = [...rows];
    const [communication] = reordered.splice(index, 1);
    return { rows: [communication, ...reordered], backfilled: false };
  }

  return {
    rows: [
      {
        competency: COMMUNICATION,
        evidence:
          'Not assessed — the evaluation did not cover this. Review the transcript directly.',
        status: 'Gap',
      },
      ...rows,
    ],
    backfilled: true,
  };
}

@Injectable()
export class ResultGenerator implements IResultGenerator {
  private readonly logger = new AppLogger('result-generator');

  constructor(private readonly gemini: GeminiClient) {}

  async generateResult(profile: CandidateProfile, transcript: ConversationTurn[]): Promise<InterviewReport> {
    const evaluation = await this.gemini.generateJson({
      ...buildEvaluationQuery(profile, transcript),
      responseSchema,
      schema: evaluationSchema,
      temperature: 0.3,
    });

    const behavioral = ensureCommunication(evaluation.behavioralCompetencies);
    if (behavioral.backfilled) {
      this.logger.warn('Evaluation omitted Communication; backfilled', {
        role: profile.targetRole,
      });
    }

    return {
      candidate: {
        name: profile.name,
        role: profile.targetRole,
        yearsOfExperience: profile.yearsOfExperience,
      },
      ...evaluation,
      behavioralCompetencies: behavioral.rows,
    };
  }
}
