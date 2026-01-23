/**
 * Shared type definitions for the CV Optimizer application
 * Following TypeScript best practices - no 'any' types allowed
 */

/**
 * Job description data structure
 * Dates are stored as ISO strings for Redux serialization compatibility
 */
export interface JobDescription {
  id: string;
  content: string;
  title?: string;
  company?: string;
  requirements?: string[];
  createdAt: string; // ISO string format
}

/**
 * CV data structure
 * Dates are stored as ISO strings for Redux serialization compatibility
 */
export interface CVData {
  id: string;
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications?: string[];
  languages?: Language[];
  rawContent?: string; // Original CV text if uploaded
  createdAt: string; // ISO string format
}

/**
 * Personal information section
 */
export interface PersonalInfo {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedIn?: string;
  portfolio?: string;
  summary?: string;
}

/**
 * Work experience entry
 */
export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string[];
  achievements?: string[];
}

/**
 * Education entry
 */
export interface Education {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
}

/**
 * Language proficiency
 */
export interface Language {
  name: string;
  proficiency: 'native' | 'fluent' | 'professional' | 'basic';
}

/**
 * Chat message in Q&A session
 * Dates are stored as ISO strings for Redux serialization compatibility
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string format
  questionType?: QuestionType;
}

/**
 * Types of questions that can be asked
 */
export type QuestionType =
  | 'personal_info'
  | 'experience'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'languages'
  | 'summary';

/**
 * Q&A session state
 * Dates are stored as ISO strings for Redux serialization compatibility
 */
export interface QASession {
  id: string;
  jobDescriptionId: string;
  messages: ChatMessage[];
  pendingQuestions: QuestionType[];
  isComplete: boolean;
  createdAt: string; // ISO string format
}

/**
 * Generation status for CV and cover letter
 */
export type GenerationStatus =
  | 'idle'
  | 'analyzing'
  | 'generating'
  | 'completed'
  | 'error';

/**
 * Generation result
 * Dates are stored as ISO strings for Redux serialization compatibility
 */
export interface GenerationResult {
  id: string;
  jobDescriptionId: string;
  cvId?: string;
  status: GenerationStatus;
  optimizedCV?: string;
  coverLetter?: string;
  error?: string;
  progress?: number;
  createdAt: string; // ISO string format
  completedAt?: string; // ISO string format
}

/**
 * Application state structure
 */
export interface AppState {
  jobDescription: JobDescription | null;
  cvData: CVData | null;
  qaSession: QASession | null;
  generationResult: GenerationResult | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  success: boolean;
  content?: string;
  error?: string;
}
