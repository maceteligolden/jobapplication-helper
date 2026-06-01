/**
 * Client helpers for workflow session APIs
 */

import { STORAGE_KEYS } from '@/src/shared/constants';

export function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.WORKFLOW_SESSION);
}

export function setStoredSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.WORKFLOW_SESSION, sessionId);
}

export function clearStoredSessionId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.WORKFLOW_SESSION);
}

/** Returns a valid session id, recreating if the stored id is stale (e.g. after dev server reload). */
export async function ensureServerSession(jobDescription: string): Promise<string> {
  const existing = getStoredSessionId();
  if (existing) {
    try {
      const res = await fetch(`/api/sessions/${existing}/state`);
      const json = await res.json();
      if (res.ok && json.success) {
        return existing;
      }
    } catch {
      /* recreate below */
    }
    clearStoredSessionId();
  }
  return createServerSession(jobDescription);
}

export async function createServerSession(jobDescription: string): Promise<string> {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobDescription }),
  });
  const json = await res.json();
  if (!json.success || !json.data?.sessionId) {
    throw new Error(json.error ?? 'Failed to create session');
  }
  setStoredSessionId(json.data.sessionId);
  return json.data.sessionId;
}

export async function runSessionAnalyze(
  sessionId: string,
  resumeText?: string,
  jobDescription?: string
) {
  const res = await fetch(`/api/sessions/${sessionId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'analyze', resumeText }),
  });
  const json = await res.json();
  if (!json.success && jobDescription && json.error?.includes('Session not found')) {
    clearStoredSessionId();
    const newId = await createServerSession(jobDescription);
    return runSessionAnalyze(newId, resumeText);
  }
  if (!json.success) throw new Error(json.error ?? 'Analysis failed');
  return json.data;
}

export async function runSessionGenerate(sessionId: string, resumeText?: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 115000);

  try {
    const res = await fetch(`/api/sessions/${sessionId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'generate', resumeText }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Generation failed');
    return json.data;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Generation timed out. Please try again.');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function sendInterviewMessage(sessionId: string, message: string, init = false) {
  const res = await fetch(`/api/sessions/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(init ? { init: true } : { message }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Interview failed');
  return json.data;
}

export function shouldRouteToInterview(matchScore: number, routing?: string): boolean {
  if (matchScore < 75) return true;
  return routing === 'interview_full' || routing === 'interview_targeted';
}

/**
 * Prepare workflow session + navigate to AI interview page.
 * Interview questions are generated live on /qa — no batch question API needed.
 */
export async function prepareInterviewSession(jobDescription: string): Promise<string> {
  return ensureServerSession(jobDescription);
}
