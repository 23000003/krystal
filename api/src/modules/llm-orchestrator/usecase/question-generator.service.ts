import { Injectable } from '@nestjs/common';
import { Type, type Schema } from '@google/genai';
import {
  questionBankSchema,
  type CandidateProfile,
  type InterviewQuestion,
} from '../../interview/types/interview.types';
import type { IQuestionGenerator } from './interface/question-generator.interface';
import { GeminiClient } from '../clients/gen-ai.client';
import { buildQuestionBankQuery } from './query-builder';
import { MAXIMUM_NUMBER_OF_QUESTIONS, MINIMUM_NUMBER_OF_QUESTIONS } from '../../../config/constants';

const responseSchema: Schema = {
  type: Type.ARRAY,
  minItems: MINIMUM_NUMBER_OF_QUESTIONS,
  maxItems: MAXIMUM_NUMBER_OF_QUESTIONS,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      topic: { type: Type.STRING },
      question: { type: Type.STRING },
    },
    required: ['id', 'topic', 'question'],
  },
};

@Injectable()
export class QuestionGenerator implements IQuestionGenerator {
  constructor(private readonly gemini: GeminiClient) {}

  generateQuestionBank(profile: CandidateProfile): Promise<InterviewQuestion[]> {
    return this.gemini.generateJson({
      ...buildQuestionBankQuery(profile),
      responseSchema,
      schema: questionBankSchema,
      temperature: 0.7,
    });
  }
}
