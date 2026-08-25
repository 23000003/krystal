export const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

export const ACCEPT_ATTR = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const WS_URL = API_URL.replace(/^http/, "ws") + "/ws/interview";

export const INTRO_DELAY_MS = 3_000;

export const READY_KEYWORD = "ready";

export const GENERIC_AUDIO = {
	introduction: "/generic-wav/introduction.wav",
	begin: "/generic-wav/begin.wav",
	conclusion: "/generic-wav/conclusion.wav",
} as const;
