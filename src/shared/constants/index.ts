/**
 * Application-wide constants
 */

export const STORAGE_KEYS = {
  CV_DATA: 'cv_optimizer_cv_data',
  JOB_DESCRIPTION: 'cv_optimizer_job_description',
  QA_SESSION: 'cv_optimizer_qa_session',
  GENERATION_RESULT: 'cv_optimizer_generation_result',
  WORKFLOW_SESSION: 'cv_optimizer_workflow_session',
} as const;

export const OPENAI_MODELS = {
  FAST: 'gpt-4o-mini',
  STRONG: 'gpt-4o',
  EMBEDDING: 'text-embedding-3-small',
} as const;

export const API_ROUTES = {
  SESSIONS: '/api/sessions',
  GENERATE_CV: '/api/cv/generate',
  GENERATE_COVER_LETTER: '/api/cover-letter/generate',
  ANALYZE_CV: '/api/cv/analyze',
  HEALTH_OPENAI: '/api/health/openai',
} as const;

/** Match routing thresholds (0-100) */
export const MATCH_THRESHOLDS = {
  INTERVIEW_FULL: 55,
  INTERVIEW_TARGETED: 75,
  GENERATE_DIRECT: 75,
} as const;

export const QUESTION_TEMPLATES: Record<string, string> = {
  personal_info: "Let's start with the basics. What's your full name?",
  experience: "Tell me about your work experience. What's your most recent position?",
  education: "What's your educational background?",
  skills: 'What are your key skills?',
  certifications: 'Do you have any professional certifications?',
  languages: 'What languages do you speak?',
  summary: 'Give me a brief professional summary about yourself.',
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;
