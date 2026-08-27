import { InterviewLoopService } from '../interview-loop.service';
import { InterviewSessionService } from '../interview-session.service';
import { IInterviewLoopServiceToken } from './interview-loop.interface';
import { IInterviewSessionServiceToken } from './interview-session.interface';

export const IUseCaseInterviewInterfaces = [
  {
    provide: IInterviewSessionServiceToken,
    useClass: InterviewSessionService,
  },
  {
    provide: IInterviewLoopServiceToken,
    useClass: InterviewLoopService,
  },
];
