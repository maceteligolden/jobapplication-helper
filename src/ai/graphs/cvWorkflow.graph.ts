import { StateGraph, START, END, MemorySaver } from '@langchain/langgraph';
import { CVWorkflowAnnotation, type CVWorkflowState } from './state';
import { classifyJobType } from '@/src/ai/agents/jobTypeClassifier.agent';
import { analyzeRole } from '@/src/ai/agents/jobAnalyzer.agent';
import { profileCandidate } from '@/src/ai/agents/candidateProfiler.agent';
import { scoreMatch } from '@/src/ai/agents/scoringEngine.agent';
import { generateResumeArtifacts } from '@/src/ai/agents/resumeGenerator.agent';
import { validateOutputs } from '@/src/ai/agents/validators.agent';
import {
  createInitialInterviewState,
  generateOpeningQuestion,
} from '@/src/ai/agents/interview.agent';
import { normalizeResumeText } from '@/src/ai/tools/parseResume.tool';

function err(node: string, message: string) {
  return {
    errors: [{ node, message, timestamp: new Date().toISOString() }],
  };
}

async function ingestResumeNode(state: CVWorkflowState): Promise<Partial<CVWorkflowState>> {
  if (!state.resumeRawText?.trim()) return {};
  try {
    return { resumeRawText: normalizeResumeText(state.resumeRawText) };
  } catch (e) {
    return err('ingestResume', e instanceof Error ? e.message : 'Parse failed');
  }
}

async function classifyJobTypeNode(state: CVWorkflowState): Promise<Partial<CVWorkflowState>> {
  try {
    const jobTypeProfile = await classifyJobType(
      state.jobDescriptionRaw,
      state.roleProfile
    );
    return { jobTypeProfile };
  } catch (e) {
    return err('classifyJobType', e instanceof Error ? e.message : 'Job type classification failed');
  }
}

async function analyzeRoleNode(state: CVWorkflowState): Promise<Partial<CVWorkflowState>> {
  try {
    const roleProfile = await analyzeRole(state.jobDescriptionRaw, state.jobTypeProfile);
    return { roleProfile };
  } catch (e) {
    return err('analyzeRole', e instanceof Error ? e.message : 'Analysis failed');
  }
}

async function profileCandidateNode(state: CVWorkflowState): Promise<Partial<CVWorkflowState>> {
  try {
    const text = state.resumeRawText?.trim() || 'No resume provided yet.';
    const resumeStructured = await profileCandidate(text);
    return { resumeStructured };
  } catch (e) {
    return err('profileCandidate', e instanceof Error ? e.message : 'Profile failed');
  }
}

async function scoreMatchNode(state: CVWorkflowState): Promise<Partial<CVWorkflowState>> {
  if (!state.roleProfile || !state.resumeStructured) {
    return { ...err('scoreMatch', 'Missing profiles'), route: 'interview' as const };
  }
  try {
    const matchReport = await scoreMatch(
      state.roleProfile,
      state.resumeStructured,
      state.jobDescriptionRaw,
      state.resumeRawText,
      state.jobTypeProfile
    );
    return { matchReport };
  } catch (e) {
    return {
      ...err('scoreMatch', e instanceof Error ? e.message : 'Scoring failed'),
    };
  }
}

async function prepareInterviewNode(state: CVWorkflowState): Promise<Partial<CVWorkflowState>> {
  if (!state.roleProfile) return err('prepareInterview', 'Missing role profile');
  if (state.interview?.messages.length) return {};

  try {
    const interview = createInitialInterviewState();
    const { buildInterviewProbeQueue, nextProbe } = await import(
      '@/src/ai/interview/interviewPlanner'
    );
    interview.probeQueue = buildInterviewProbeQueue(
      state.resumeStructured,
      state.matchReport,
      state.jobTypeProfile
    );
    const firstProbe = nextProbe(interview.probeQueue);
    const opening = await generateOpeningQuestion(
      state.roleProfile,
      state.matchReport,
      state.resumeStructured,
      state.jobTypeProfile,
      firstProbe?.prompt
    );
    if (firstProbe) {
      interview.currentProbeId = firstProbe.id;
      interview.probeQueue = interview.probeQueue.map((p) =>
        p.id === firstProbe.id ? { ...p, status: 'in_progress' as const } : p
      );
    }
    interview.messages.push({
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: opening,
      timestamp: new Date().toISOString(),
    });
    return { interview, route: 'interview' as const };
  } catch (e) {
    return err('prepareInterview', e instanceof Error ? e.message : 'Interview init failed');
  }
}

async function generateResumeNode(state: CVWorkflowState): Promise<Partial<CVWorkflowState>> {
  if (!state.roleProfile || !state.resumeStructured) {
    return { ...err('generateResume', 'Missing profiles') };
  }
  try {
    const artifacts = await generateResumeArtifacts(
      state.roleProfile,
      state.resumeStructured,
      state.jobDescriptionRaw,
      state.resumeRawText,
      state.jobTypeProfile,
      state.interview?.limitations
    );
    return { artifacts, route: 'validate' as const };
  } catch (e) {
    return err('generateResume', e instanceof Error ? e.message : 'Generation failed');
  }
}

async function validateOutputsNode(state: CVWorkflowState): Promise<Partial<CVWorkflowState>> {
  if (!state.artifacts || !state.resumeStructured) return { route: 'complete' as const };
  try {
    const validationResults = await validateOutputs(
      state.artifacts,
      state.resumeStructured,
      state.jobTypeProfile,
      state.interview?.limitations
    );
    const route = validationResults.requiresHumanReview
      ? ('human_review' as const)
      : ('complete' as const);
    return { validationResults, route };
  } catch (e) {
    return {
      ...err('validateOutputs', e instanceof Error ? e.message : 'Validation failed'),
      route: 'complete' as const,
    };
  }
}

function routeAfterScore(state: CVWorkflowState): 'prepare_interview' | 'generate_resume' {
  if (state.userOverride === 'generate') return 'generate_resume';
  const rec = state.matchReport?.routingRecommendation;
  if (rec === 'generate') return 'generate_resume';
  return 'prepare_interview';
}

const checkpointer = new MemorySaver();

export function buildCvWorkflowGraph() {
  return new StateGraph(CVWorkflowAnnotation)
    .addNode('ingest_resume', ingestResumeNode)
    .addNode('analyze_role', analyzeRoleNode)
    .addNode('profile_candidate', profileCandidateNode)
    .addNode('score_match', scoreMatchNode)
    .addNode('prepare_interview', prepareInterviewNode)
    .addNode('generate_resume', generateResumeNode)
    .addNode('validate_outputs', validateOutputsNode)
    .addEdge(START, 'ingest_resume')
    .addEdge('ingest_resume', 'analyze_role')
    .addEdge('analyze_role', 'profile_candidate')
    .addEdge('profile_candidate', 'score_match')
    .addConditionalEdges('score_match', routeAfterScore, {
      prepare_interview: 'prepare_interview',
      generate_resume: 'generate_resume',
    })
    .addEdge('prepare_interview', END)
    .addEdge('generate_resume', 'validate_outputs')
    .addEdge('validate_outputs', END)
    .compile({ checkpointer });
}

let compiledGraph: ReturnType<typeof buildCvWorkflowGraph> | null = null;

export function getCvWorkflowGraph() {
  if (!compiledGraph) compiledGraph = buildCvWorkflowGraph();
  return compiledGraph;
}

/** Run ingest → analyze → profile → score only (no interview init, no CV generation). */
export async function runWorkflowAnalyzeOnly(state: CVWorkflowState): Promise<CVWorkflowState> {
  let current: CVWorkflowState = {
    ...state,
    userOverride: null,
    artifacts: null,
    validationResults: null,
    interview: null,
  };

  for (const step of [
    ingestResumeNode,
    classifyJobTypeNode,
    analyzeRoleNode,
    profileCandidateNode,
    scoreMatchNode,
  ] as const) {
    const patch = await step(current);
    current = { ...current, ...patch };
    if (current.errors.length > 0) break;
  }

  if (current.matchReport) {
    current.route =
      current.matchReport.routingRecommendation === 'generate' ? 'generate' : 'interview';
  }

  return current;
}

/** Generate CV from existing workflow state — does not re-run the full graph from START. */
export async function runWorkflowGenerate(state: CVWorkflowState): Promise<CVWorkflowState> {
  let current: CVWorkflowState = { ...state, userOverride: 'generate' };

  if (!current.roleProfile || !current.resumeStructured || !current.matchReport) {
    current = await runWorkflowAnalyzeOnly(current);
  }

  const genPatch = await generateResumeNode(current);
  current = { ...current, ...genPatch };

  if (!current.artifacts && current.roleProfile && current.resumeStructured) {
    const artifacts = await generateResumeArtifacts(
      current.roleProfile,
      current.resumeStructured,
      current.jobDescriptionRaw,
      current.resumeRawText,
      current.jobTypeProfile,
      current.interview?.limitations
    );
    const validationResults = await validateOutputs(
      artifacts,
      current.resumeStructured,
      current.jobTypeProfile,
      current.interview?.limitations
    );
    current = { ...current, artifacts, validationResults, route: 'complete' };
  } else if (current.artifacts && current.resumeStructured) {
    const valPatch = await validateOutputsNode(current);
    current = { ...current, ...valPatch };
  }

  return current;
}

export async function runWorkflowUntilPause(
  state: CVWorkflowState,
  options?: { resumeText?: string; userOverride?: 'interview' | 'generate' }
): Promise<CVWorkflowState> {
  let input = { ...state, ...options };
  if (options?.resumeText) input.resumeRawText = options.resumeText;
  if (options?.userOverride === 'generate') {
    return runWorkflowGenerate(input);
  }
  return runWorkflowAnalyzeOnly(input);
}
