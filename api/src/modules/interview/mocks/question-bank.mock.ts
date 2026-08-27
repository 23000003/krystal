import type {
  CandidateProfile,
  InterviewQuestion,
} from '../types/interview.types';

/**
 * Transcribed from the recorded run in `../dionysus/public/questions.txt`. Used when
 * MOCK_SESSION=true so the interview loop can be exercised without spending a
 * resume upload and two Gemini calls on every reload.
 */
export const MOCK_QUESTION_BANK: InterviewQuestion[] = [
  {
    id: 'system-architecture-nest-vs-aspnet',
    topic: 'System Architecture',
    question:
      'When deciding between Nest.js and ASP.NET for building a new backend service in your stack, what key factors influence your choice?',
  },
  {
    id: 'technical-tradeoffs-postgresql-mongodb',
    topic: 'Database Management',
    question:
      'Can you walk me through a specific scenario where you would choose PostgreSQL over MongoDB for a full-stack project?',
  },
  {
    id: 'concurrency-golang-node',
    topic: 'Concurrency',
    question:
      'How do you approach handling high-concurrency tasks in Golang compared to asynchronous programming in Node.js?',
  },
  {
    id: 'cloud-infrastructure-aws-azure',
    topic: 'Cloud Infrastructure',
    question:
      'Which cloud provider do you feel most comfortable deploying containerized microservices to, and what has been your biggest challenge with it?',
  },
  {
    id: 'state-management-nextjs-react',
    topic: 'Frontend Engineering',
    question:
      'How do you manage complex application state and data fetching when building highly dynamic interfaces with Next.js?',
  },
  {
    id: 'testing-strategy-playwright-jest',
    topic: 'Quality Assurance',
    question:
      'What is your philosophy on balancing unit tests with end-to-end tests using tools like Playwright and Jest?',
  },
  {
    id: 'leadership-fast-paced-delivery',
    topic: 'Leadership and Delivery',
    question:
      'As someone stepping into a lead role with one year of intensive experience, how do you handle technical disagreements with senior team members?',
  },
];

export const MOCK_CANDIDATE_PROFILE: CandidateProfile = {
  name: 'Kentward Maratas',
  targetRole: 'Lead Full-Stack Software Engineer',
  skills: ['TypeScript', 'Next.js', 'Nest.js', 'Golang', 'PostgreSQL', 'AWS'],
  yearsOfExperience: 1,
  education: 'BS Computer Science',
  keyExperience: {
    title: 'Krystal AI Interviewer',
    organization: 'Personal project',
    summary:
      'Built a voice-based mock interview app with a Next.js SPA and a NestJS ' +
      'API, including the WebSocket audio loop and the LLM orchestration.',
  },
};
