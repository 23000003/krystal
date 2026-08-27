import { Module } from '@nestjs/common';
import { LlmModule } from '../llm-orchestrator/llm-orchestrator.module';
import { ResumeModule } from '../resume/resume.module';
import { InterviewController } from './adapter/interview.controller';
import { InterviewGateway } from './adapter/interview.gateway';
import { IStoreInterfaces } from './stores/interface';
import { IUseCaseInterviewInterfaces } from './usecase/interface';

@Module({
  imports: [LlmModule, ResumeModule],
  controllers: [InterviewController],
  providers: [
    ...IUseCaseInterviewInterfaces,
    ...IStoreInterfaces,
    InterviewGateway,
  ],
})
export class InterviewModule {}
