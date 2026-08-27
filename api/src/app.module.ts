import { Module } from '@nestjs/common';
import { InterviewModule } from './modules/interview/interview.module';

@Module({
  imports: [InterviewModule],
})
export class AppModule {}
