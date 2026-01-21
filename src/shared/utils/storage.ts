/**
 * Local storage utility functions
 * Handles serialization and error handling for browser storage
 */

import { STORAGE_KEYS } from '../constants';
import type { CVData, JobDescription, QASession, GenerationResult } from '../types';

/**
 * Generic storage getter with error handling
 */
function getFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading from storage (${key}):`, error);
    return null;
  }
}

/**
 * Generic storage setter with error handling
 */
function setToStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to storage (${key}):`, error);
    return false;
  }
}

/**
 * Remove item from storage
 */
function removeFromStorage(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from storage (${key}):`, error);
    return false;
  }
}

/**
 * CV Data storage functions
 */
export const cvStorage = {
  get: (): CVData | null => getFromStorage<CVData>(STORAGE_KEYS.CV_DATA),
  set: (data: CVData): boolean => setToStorage(STORAGE_KEYS.CV_DATA, data),
  remove: (): boolean => removeFromStorage(STORAGE_KEYS.CV_DATA),
};

/**
 * Job Description storage functions
 */
export const jobDescriptionStorage = {
  get: (): JobDescription | null => getFromStorage<JobDescription>(STORAGE_KEYS.JOB_DESCRIPTION),
  set: (data: JobDescription): boolean => setToStorage(STORAGE_KEYS.JOB_DESCRIPTION, data),
  remove: (): boolean => removeFromStorage(STORAGE_KEYS.JOB_DESCRIPTION),
};

/**
 * Q&A Session storage functions
 */
export const qaSessionStorage = {
  get: (): QASession | null => getFromStorage<QASession>(STORAGE_KEYS.QA_SESSION),
  set: (data: QASession): boolean => setToStorage(STORAGE_KEYS.QA_SESSION, data),
  remove: (): boolean => removeFromStorage(STORAGE_KEYS.QA_SESSION),
};

/**
 * Generation Result storage functions
 */
export const generationResultStorage = {
  get: (): GenerationResult | null => getFromStorage<GenerationResult>(STORAGE_KEYS.GENERATION_RESULT),
  set: (data: GenerationResult): boolean => setToStorage(STORAGE_KEYS.GENERATION_RESULT, data),
  remove: (): boolean => removeFromStorage(STORAGE_KEYS.GENERATION_RESULT),
};

/**
 * Clear all application data from storage
 */
export function clearAllStorage(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    removeFromStorage(key);
  });
}
