import { ProfileExtractor } from '../profile-extractor.service';
import { QuestionGenerator } from '../question-generator.service';
import { ResultGenerator } from '../result-generator.service';
import { IProfileExtractorToken } from './profile-extractor.interface';
import { IQuestionGeneratorToken } from './question-generator.interface';
import { IResultGeneratorToken } from './result-generator.interface';

export const IUseCaseInterfaces = [
  {
    provide: IProfileExtractorToken,
    useClass: ProfileExtractor,
  },
  {
    provide: IQuestionGeneratorToken,
    useClass: QuestionGenerator,
  },
  {
    provide: IResultGeneratorToken,
    useClass: ResultGenerator,
  },
];
