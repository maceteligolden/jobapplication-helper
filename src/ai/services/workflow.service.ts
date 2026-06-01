import {
  createSession,
  getSession,
  updateWorkflowState,
  type SessionRecord,
} from '@/src/infrastructure/storage/session.store';
import {
  initialWorkflowState,
  type CVWorkflowState,
} from '@/src/ai/graphs/state';
import {
  runWorkflowUntilPause,
  runWorkflowAnalyzeOnly,
  runWorkflowGenerate,
} from '@/src/ai/graphs/cvWorkflow.graph';
import { profileCandidate } from '@/src/ai/agents/candidateProfiler.agent';
import {
  processInterviewMessage,
  initInterviewIfNeeded,
} from '@/src/ai/graphs/interview.graph';
import { configureLangSmith } from '@/src/ai/observability/langsmith.config';

configureLangSmith();

export async function createWorkflowSession(
  jobDescriptionRaw: string
): Promise<SessionRecord> {
  return createSession(jobDescriptionRaw);
}

export async function getWorkflowState(sessionId: string): Promise<CVWorkflowState | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  return {
    ...initialWorkflowState(sessionId, session.jobDescriptionRaw),
    ...session.workflowState,
    sessionId,
    jobDescriptionRaw: session.jobDescriptionRaw,
  } as CVWorkflowState;
}

async function persistState(state: CVWorkflowState): Promise<void> {
  await updateWorkflowState(state.sessionId, state);
}

export async function runAnalyzePipeline(
  sessionId: string,
  resumeText?: string
): Promise<CVWorkflowState> {
  let state = await getWorkflowState(sessionId);
  if (!state) throw new Error('Session not found');

  if (resumeText) state.resumeRawText = resumeText;

  state = await runWorkflowAnalyzeOnly(state);
  await persistState(state);
  return state;
}

export async function runFullPipeline(
  sessionId: string,
  options?: { resumeText?: string; userOverride?: 'interview' | 'generate' }
): Promise<CVWorkflowState> {
  let state = await getWorkflowState(sessionId);
  if (!state) throw new Error('Session not found');

  state = await runWorkflowUntilPause(state, options);
  await persistState(state);
  return state;
}

async function ensureResumeForGeneration(
  state: CVWorkflowState,
  resumeTextOverride?: string
): Promise<CVWorkflowState> {
  const raw =
    resumeTextOverride?.trim() ||
    state.resumeRawText?.trim() ||
    state.resumeStructured?.rawText?.trim() ||
    '';

  if (!raw) return state;

  const bullets = state.resumeStructured?.experience?.reduce(
    (n, e) => n + (e.bullets?.length ?? 0),
    0
  ) ?? 0;
  const needsReprofile =
    Boolean(resumeTextOverride) ||
    bullets < 1 ||
    (state.resumeStructured?.experience?.length ?? 0) === 0;

  let resumeStructured = state.resumeStructured;
  if (needsReprofile) {
    resumeStructured = await profileCandidate(raw);
  }

  return {
    ...state,
    resumeRawText: raw,
    resumeStructured: { ...resumeStructured!, rawText: raw },
  };
}

export async function runGeneratePipeline(
  sessionId: string,
  resumeText?: string
): Promise<CVWorkflowState> {
  let state = await getWorkflowState(sessionId);
  if (!state) throw new Error('Session not found');

  state = await ensureResumeForGeneration(state, resumeText);
  await updateWorkflowState(state.sessionId, {
    resumeRawText: state.resumeRawText,
    resumeStructured: state.resumeStructured,
  });

  state = await runWorkflowGenerate(state);
  await persistState(state);
  return state;
}

export async function handleInterviewMessage(
  sessionId: string,
  message: string
) {
  const state = await getWorkflowState(sessionId);
  if (!state) throw new Error('Session not found');

  const result = await processInterviewMessage(state, message);
  const updated: CVWorkflowState = {
    ...state,
    interview: result.interview,
    resumeStructured: result.candidateProfile ?? state.resumeStructured,
    route: result.isComplete ? 'generate' : 'interview',
  };
  await persistState(updated);
  return { state: updated, ...result };
}

export async function startInterview(sessionId: string) {
  const state = await getWorkflowState(sessionId);
  if (!state) throw new Error('Session not found');

  const result = await initInterviewIfNeeded(state);
  const updated: CVWorkflowState = { ...state, interview: result.interview, route: 'interview' };
  await persistState(updated);
  return { state: updated, ...result };
}
