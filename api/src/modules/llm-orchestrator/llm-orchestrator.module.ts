import { Module } from '@nestjs/common';
import { GeminiClient } from './clients/gen-ai.client';
import { TtsClient } from './clients/tts.client';
import { TranscriberClient } from './clients/transcriber.client';
import { IUseCaseInterfaces } from './usecase/interface';
import { IProfileExtractorToken } from './usecase/interface/profile-extractor.interface';
import { IQuestionGeneratorToken } from './usecase/interface/question-generator.interface';
import { IResultGeneratorToken } from './usecase/interface/result-generator.interface';

@Module({
  providers: [GeminiClient, TtsClient, TranscriberClient, ...IUseCaseInterfaces],
  exports: [
    TtsClient,
    TranscriberClient,
    IProfileExtractorToken,
    IQuestionGeneratorToken,
    IResultGeneratorToken,
  ],
})
export class LlmModule {}
