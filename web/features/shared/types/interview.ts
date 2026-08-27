export type KeyExperience = {
	title: string;
	organization: string;
	summary: string;
};

export type CandidateProfile = {
	name: string;
	targetRole: string;
	skills: string[];
	yearsOfExperience: number;
	education: string;
	keyExperience: KeyExperience;
};

export type InterviewQuestion = {
	id: string;
	topic: string;
	question: string;
};

export type ConversationTurn = {
	questionId: string;
	question: string;
	answer: string;
	timestamp: string;
};

export type SessionState = {
	sessionId: string;
	candidate: CandidateProfile;
	questionBank: InterviewQuestion[];
	currentQuestionIndex: number;
	conversationHistory: ConversationTurn[];
	status: "ready" | "in-progress" | "completed";
	createdAt: string;
};

export type CreateSessionResponse = {
	sessionId: string;
	profile: CandidateProfile;
	questionBank: InterviewQuestion[];
};

/**  evaluation report. */
export type CompetencyStatus = "Strong" | "Adequate" | "Gap" | "Gap — [HIGH]";

export type TechnicalCompetency = {
	competency: string;
	evidence: string;
	bar: string;
	status: CompetencyStatus;
};

export type BehavioralCompetency = {
	competency: string;
	evidence: string;
	status: CompetencyStatus;
};

export type InterviewReport = {
	candidate: { name: string; role: string; yearsOfExperience: number };
	technicalCompetencies: TechnicalCompetency[];
	behavioralCompetencies: BehavioralCompetency[];
};
