import type {
  CandidateProfile,
  ConversationTurn,
} from '../../interview/types/interview.types';

/** Prevents an overly long resume from blowing up the prompt. */
const MAX_RESUME_CHARS = 20_000;

export type SeniorityBand = 'Junior' | 'Mid' | 'Senior';

export function seniorityBand(yearsOfExperience: number): SeniorityBand {
  if (yearsOfExperience < 3) return 'Junior';
  if (yearsOfExperience <= 5) return 'Mid';
  return 'Senior';
}

const BAND_BRIEF: Record<SeniorityBand, string> = {
  Junior:
    'Junior (under 3 years). Ask about fundamentals and what they personally ' +
    'built. Expect them to explain their own code and reason about one system ' +
    'at a time. Do not ask about org-wide architecture or team leadership.',
  Mid:
    'Mid-level (3 to 5 years). Ask about trade-offs, debugging real failures, ' +
    'and why they chose one approach over another. Expect ownership of a ' +
    'feature end to end, not of a whole platform.',
  Senior:
    'Senior (over 5 years). Ask about system design, failure modes at scale, ' +
    'and decisions with lasting consequences. Expect them to justify ' +
    'architecture, weigh cost against complexity, and speak to influencing ' +
    'other engineers.',
};

export function buildProfileQuery(resumeText: string) {
  return {
    systemInstruction:
      'You extract structured candidate profiles from resumes for an interview ' +
      'preparation tool. Base every field strictly on the resume text — never ' +
      'invent experience.\n\n' +
      '`skills` is not a keyword dump. List only the technologies the resume ' +
      'actually evidences through work history or projects: the candidate ' +
      'shipped something with it, or describes using it in a named role or ' +
      'project. Drop anything that appears only in a "Skills" or "Familiar ' +
      'with" list with no work behind it, and drop tools their years of ' +
      'experience make implausible to know deeply. Order strongest first and ' +
      'return at most 10. Fewer, well-evidenced entries beat a long list.\n\n' +
      '`keyExperience` is the single most substantial thing they did — the role ' +
      'or project with the most concrete detail, preferring recent and ' +
      'technical work. `summary` states what they personally did there, in one ' +
      'or two sentences, using the resume\'s own specifics.\n\n' +
      'If the target role is not stated, infer the most likely one from their ' +
      'recent work. If a field is genuinely absent, use "Unknown" for strings ' +
      'and 0 for years of experience.',
    prompt: `Extract the candidate profile from this resume.\n\n<resume>\n${resumeText.slice(
      0,
      MAX_RESUME_CHARS,
    )}\n</resume>`,
  };
}

export function buildQuestionBankQuery(profile: CandidateProfile) {
  const band = seniorityBand(profile.yearsOfExperience);

  return {
    systemInstruction:
      'You are an experienced technical interviewer preparing an opening ' +
      'question bank for a spoken mock interview.\n\n' +
      `Calibrate difficulty to this candidate: ${BAND_BRIEF[band]}\n\n` +
      'Exactly one question must be about their key experience — name the ' +
      'project or role in the question and ask what they personally did on it, ' +
      'not what the team did. Give that one the id "key-experience".\n\n' +
      'Draw the rest from the skills listed, so the interview probes what they ' +
      'actually claim to know. Mix "technical" and "behavioral" topics. Write ' +
      'questions specific to this background rather than generic ones, and ' +
      'phrase them the way an interviewer would say them out loud. Give each ' +
      'question a short kebab-case id. Ask one thing per question — no ' +
      'multi-part questions, since the candidate answers them out loud.',
    prompt: [
      `Generate 5 to 8 interview questions for this candidate.`,
      '',
      `Target role: ${profile.targetRole}`,
      `Years of experience: ${profile.yearsOfExperience} (${band})`,
      `Evidenced skills: ${profile.skills.join(', ')}`,
      '',
      'Key experience:',
      `  ${profile.keyExperience.title} — ${profile.keyExperience.organization}`,
      `  ${profile.keyExperience.summary}`,
    ].join('\n'),
  };
}

export function buildEvaluationQuery(
  profile: CandidateProfile,
  transcript: ConversationTurn[],
) {
  const band = seniorityBand(profile.yearsOfExperience);

  const conversation = transcript
    .map(
      (turn, index) =>
        `Q${index + 1}: ${turn.question}\nA${index + 1}: ${
          turn.answer || '(no answer recorded)'
        }`,
    )
    .join('\n\n');

  return {
    systemInstruction:
      'You are a hiring panel writing an evidence-based interview debrief.\n\n' +
      'Judge only what the transcript actually shows — never infer skill from ' +
      'the resume alone, and never invent quotes. Derive the competencies from ' +
      'the questions that were asked, so the list reflects this interview ' +
      'rather than a fixed rubric.\n\n' +
      `Judge against this level, not an absolute one: ${BAND_BRIEF[band]} An ` +
      'answer that would be thin from a senior can be perfectly adequate from ' +
      'a junior, and vice versa.\n\n' +
      '`behavioralCompetencies` must always include one named exactly ' +
      '"Communication", judging how clearly the candidate structured and ' +
      'delivered their answers — a spoken interview always shows this. List it ' +
      'first, then any others the transcript supports.\n\n' +
      'For each competency, `evidence` paraphrases what the candidate actually ' +
      'said, and `bar` states what a solid answer at this level would have ' +
      'demonstrated. Mark "Gap — [HIGH]" only when the gap is disqualifying ' +
      'for the target role at this level. If an answer is missing or ' +
      'unintelligible, say so in the evidence and do not credit the candidate. ' +
      'Be concise: one or two sentences per field.',
    prompt: [
      `Target role: ${profile.targetRole}`,
      `Years of experience: ${profile.yearsOfExperience} (${band})`,
      `Evidenced skills: ${profile.skills.join(', ')}`,
      `Key experience: ${profile.keyExperience.title} — ${profile.keyExperience.organization}`,
      '',
      'Transcript:',
      conversation,
    ].join('\n'),
  };
}
