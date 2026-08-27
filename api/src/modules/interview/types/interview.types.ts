import { z } from 'zod';

/** == The structured profile pulled out of the resume text. == */
export const keyExperienceSchema = z.object({
  title: z.string().min(1),
  organization: z.string().min(1),
  summary: z.string().min(1),
});

export const candidateProfileSchema = z.object({
  name: z.string().min(1),
  targetRole: z.string().min(1),
  skills: z.array(z.string()).min(1).max(10),
  // Models sometimes answer "5" or "5+" instead of 5.
  yearsOfExperience: z.coerce.number().min(0).max(70),
  education: z.string(),
  /** The single most substantial thing they did, for a targeted question. */
  keyExperience: keyExperienceSchema,
});

/** == Question from the opening question bank. == */
export const interviewQuestionSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  question: z.string().min(1),
});

export const questionBankSchema = z.array(interviewQuestionSchema).min(5).max(8);

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export type KeyExperience = z.infer<typeof keyExperienceSchema>;
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;

/** One answered question, appended as the interview progresses. */
export type ConversationTurn = {
  questionId: string;
  question: string;
  answer: string;
  timestamp: string;
};

/** == Evaluation report. == */
export const competencyStatusSchema = z.enum([
  'Strong',
  'Adequate',
  'Gap',
  'Gap — [HIGH]',
]);

export const technicalCompetencySchema = z.object({
  competency: z.string().min(1),
  evidence: z.string().min(1),
  bar: z.string().min(1),
  status: competencyStatusSchema,
});

export const behavioralCompetencySchema = z.object({
  competency: z.string().min(1),
  evidence: z.string().min(1),
  status: competencyStatusSchema,
});

export const evaluationSchema = z.object({
  technicalCompetencies: z.array(technicalCompetencySchema).min(1),
  behavioralCompetencies: z.array(behavioralCompetencySchema).min(1),
});

export type CompetencyStatus = z.infer<typeof competencyStatusSchema>;
export type TechnicalCompetency = z.infer<typeof technicalCompetencySchema>;
export type BehavioralCompetency = z.infer<typeof behavioralCompetencySchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;

export type InterviewReport = Evaluation & {
  candidate: { name: string; role: string; yearsOfExperience: number };
};

export type SessionState = {
  sessionId: string;
  candidate: CandidateProfile;
  questionBank: InterviewQuestion[];
  currentQuestionIndex: number;
  conversationHistory: ConversationTurn[];
  status: 'ready' | 'in-progress' | 'completed';
  createdAt: string;
  /** Filled in after the interview ends; undefined while it is generating. */
  report?: InterviewReport;
};

export type CreateSessionResponse = {
  sessionId: string;
  profile: CandidateProfile;
  questionBank: InterviewQuestion[];
};
