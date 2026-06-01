import { Annotation } from '@langchain/langgraph';
import type { RoleIntelligenceProfile } from '@/src/ai/schemas/roleProfile.schema';
import type { CandidateProfile } from '@/src/ai/schemas/candidateProfile.schema';
import type { MatchReport } from '@/src/ai/schemas/matchReport.schema';
import type { InterviewState } from '@/src/ai/schemas/interview.schema';
import type { GenerationArtifact, ValidationReport } from '@/src/ai/schemas/generation.schema';
import type { JobTypeProfile } from '@/src/ai/schemas/jobTypeProfile.schema';

export interface WorkflowError {
  node: string;
  message: string;
  timestamp: string;
}

export type WorkflowRoute =
  | 'parse'
  | 'analyze_role'
  | 'profile_candidate'
  | 'score'
  | 'interview'
  | 'generate'
  | 'validate'
  | 'complete'
  | 'human_review';

export interface CVWorkflowState {
  sessionId: string;
  jobDescriptionRaw: string;
  roleProfile: RoleIntelligenceProfile | null;
  jobTypeProfile: JobTypeProfile | null;
  resumeRawText: string | null;
  resumeStructured: CandidateProfile | null;
  matchReport: MatchReport | null;
  interview: InterviewState | null;
  artifacts: GenerationArtifact | null;
  validationResults: ValidationReport | null;
  errors: WorkflowError[];
  route: WorkflowRoute;
  userOverride?: 'interview' | 'generate' | null;
  pendingUserMessage?: string | null;
}

export const CVWorkflowAnnotation = Annotation.Root({
  sessionId: Annotation<string>,
  jobDescriptionRaw: Annotation<string>,
  roleProfile: Annotation<RoleIntelligenceProfile | null>,
  jobTypeProfile: Annotation<JobTypeProfile | null>,
  resumeRawText: Annotation<string | null>,
  resumeStructured: Annotation<CandidateProfile | null>,
  matchReport: Annotation<MatchReport | null>,
  interview: Annotation<InterviewState | null>,
  artifacts: Annotation<GenerationArtifact | null>,
  validationResults: Annotation<ValidationReport | null>,
  errors: Annotation<WorkflowError[]>({
    reducer: (left, right) => [...(left ?? []), ...(right ?? [])],
    default: () => [],
  }),
  route: Annotation<WorkflowRoute>,
  userOverride: Annotation<'interview' | 'generate' | null>,
  pendingUserMessage: Annotation<string | null>,
});

export function initialWorkflowState(
  sessionId: string,
  jobDescriptionRaw: string
): CVWorkflowState {
  return {
    sessionId,
    jobDescriptionRaw,
    roleProfile: null,
    jobTypeProfile: null,
    resumeRawText: null,
    resumeStructured: null,
    matchReport: null,
    interview: null,
    artifacts: null,
    validationResults: null,
    errors: [],
    route: 'parse',
    userOverride: null,
    pendingUserMessage: null,
  };
}
