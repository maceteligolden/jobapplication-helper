/**
 * Application-wide constants
 */

/**
 * Storage keys for local storage
 */
export const STORAGE_KEYS = {
  CV_DATA: 'cv_optimizer_cv_data',
  JOB_DESCRIPTION: 'cv_optimizer_job_description',
  QA_SESSION: 'cv_optimizer_qa_session',
  GENERATION_RESULT: 'cv_optimizer_generation_result',
} as const;

/**
 * Hugging Face model configurations
 * Using Meta's Llama 3.1 8B Instruct for best text generation quality
 */
export const HUGGINGFACE_MODELS = {
  CV_GENERATION: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
  COVER_LETTER: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
  // Fallback models if primary fails
  FALLBACK: 'mistralai/Mistral-7B-Instruct-v0.2',
} as const;

/**
 * API route paths
 */
export const API_ROUTES = {
  GENERATE_CV: '/api/cv/generate',
  GENERATE_COVER_LETTER: '/api/cover-letter/generate',
  ANALYZE_JOB: '/api/job/analyze',
} as const;

/**
 * Question templates for Q&A session
 */
export const QUESTION_TEMPLATES: Record<string, string> = {
  personal_info: "Let's start with the basics. What's your full name?",
  experience: "Tell me about your work experience. What's your most recent position?",
  education: "What's your educational background?",
  skills: "What are your key skills?",
  certifications: "Do you have any professional certifications?",
  languages: "What languages do you speak?",
  summary: "Give me a brief professional summary about yourself.",
};

/**
 * Maximum file size for CV upload (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed file types for CV upload
 */
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;
