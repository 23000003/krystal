import { Module } from '@nestjs/common';
import { ResumeParserService } from './resume-parser.service';

@Module({
  providers: [ResumeParserService],
  exports: [ResumeParserService],
})
export class ResumeModule {}
