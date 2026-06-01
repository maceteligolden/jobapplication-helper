import { getChatStrong, createStreamingChat } from '@/src/infrastructure/llm/openai.client';
import {
  AnswerEvaluationSchema,
  type InterviewState,
  type AnswerEvaluation,
} from '@/src/ai/schemas/interview.schema';
import type { RoleIntelligenceProfile } from '@/src/ai/schemas/roleProfile.schema';
import type { MatchReport } from '@/src/ai/schemas/matchReport.schema';
import type { CandidateProfile } from '@/src/ai/schemas/candidateProfile.schema';
import type { JobTypeProfile } from '@/src/ai/schemas/jobTypeProfile.schema';

const DECLINE_PATTERNS =
  /\b(don'?t know|do not know|not sure|no idea|can'?t remember|cannot remember|don'?t have|do not have|n\/a|not applicable|skip|move on|prefer not|no example|nothing to add|that'?s all i have|unsure)\b/i;

const FINISH_PATTERNS =
  /\b(generate|skip interview|that'?s all|move to cv|move on to cv|enough info|proceed to generate|finish interview|ready to generate)\b/i;

export function detectDeclineIntent(message: string): boolean {
  return DECLINE_PATTERNS.test(message.trim());
}

export function detectFinishIntent(message: string): boolean {
  return FINISH_PATTERNS.test(message.trim());
}

export function createInitialInterviewState(): InterviewState {
  return {
    messages: [],
    topicCoverage: [],
    extractedFacts: [],
    probeQueue: [],
    limitations: [],
    userRequestedFinish: false,
    summary: '',
    isComplete: false,
    currentTopic: '',
    currentProbeId: '',
    turnCount: 0,
  };
}

export async function generateOpeningQuestion(
  roleProfile: RoleIntelligenceProfile,
  matchReport: MatchReport | null,
  candidateProfile: CandidateProfile | null,
  jobTypeProfile?: JobTypeProfile | null,
  probePrompt?: string
): Promise<string> {
  if (probePrompt?.trim()) return probePrompt.trim();

  const gaps = matchReport?.gaps?.slice(0, 5) ?? [];
  const response = await getChatStrong().invoke([
    {
      role: 'system',
      content: `You are a senior recruiter conducting an interview to gather resume-ready, measurable achievements.
Ask ONE focused question. Require specifics: metrics, timeline, team size, tools, outcomes.
Job type: ${jobTypeProfile?.jobType ?? roleProfile.archetype}. Bullet style: ${jobTypeProfile?.bulletFramework ?? 'CAR'}.
Do NOT tell the candidate to skip the interview or generate their CV.`,
    },
    {
      role: 'user',
      content: `Role: ${roleProfile.archetype} / ${roleProfile.seniority} in ${roleProfile.industry}.
Gaps: ${gaps.map((g) => `[${g.category}] ${g.requirement}`).join('; ') || 'general experience'}.
Traits to probe: ${jobTypeProfile?.implicitTraitsToProbe?.map((t) => t.trait).join(', ') || 'none'}.
Candidate summary: ${candidateProfile?.personalInfo.summary ?? 'Unknown'}.
Generate opening question.`,
    },
  ]);

  const content = typeof response.content === 'string' ? response.content : String(response.content);
  return content.trim();
}

export async function evaluateAnswer(
  roleProfile: RoleIntelligenceProfile,
  question: string,
  answer: string,
  interview: InterviewState,
  jobTypeProfile?: JobTypeProfile | null
): Promise<AnswerEvaluation> {
  if (detectDeclineIntent(answer)) {
    return {
      completeness: 0,
      specificity: 0,
      relevance: 0.5,
      isOffTopic: false,
      followUpNeeded: false,
      followUpQuestion: '',
      hasMetrics: false,
      userDeclined: true,
      declineKind: 'unknown',
      implicationForCv: '',
      extractedFacts: [],
    };
  }

  const structured = getChatStrong().withStructuredOutput(AnswerEvaluationSchema, {
    name: 'answer_evaluation',
  });

  const raw = await structured.invoke([
    {
      role: 'system',
      content: `Evaluate interview answers for completeness, specificity, and metrics.
If the user cannot provide info (don't know, N/A, skip, move on, prefer not to say), set userDeclined true, followUpNeeded false, and implicationForCv explaining CV impact (dates→year-only; projects→section omitted; certs→may not meet license reqs).
If vague (e.g. "I worked on APIs"), set followUpNeeded true — ask scale, stack, impact, team size, timeline.
For experience answers, set hasMetrics true only if answer includes numbers (%, $, users, hours, team size).
Extract resume-ready facts using framework ${jobTypeProfile?.bulletFramework ?? 'STAR'} when jobType is software_engineering or data_analytics.
For date questions, extract dateRange in MMM YYYY format in extractedFacts.
Never invent information.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        role: roleProfile,
        jobType: jobTypeProfile?.jobType,
        question,
        answer,
        priorSummary: interview.summary,
        turnCount: interview.turnCount,
      }),
    },
  ]);

  const needsMetrics =
    jobTypeProfile?.jobType === 'software_engineering' ||
    jobTypeProfile?.jobType === 'data_analytics';

  let followUpNeeded = raw.userDeclined ? false : raw.followUpNeeded;
  if (!raw.userDeclined && needsMetrics && !raw.hasMetrics && raw.completeness > 0.4) {
    followUpNeeded = true;
  }

  return {
    ...raw,
    followUpNeeded,
    followUpQuestion: raw.followUpQuestion ?? '',
    hasMetrics: raw.hasMetrics ?? false,
    userDeclined: raw.userDeclined ?? false,
    declineKind: raw.declineKind ?? 'unknown',
    implicationForCv: raw.implicationForCv ?? '',
    extractedFacts: raw.extractedFacts.map((f) => ({
      text: f.text,
      metrics: f.metrics ?? [],
      framework: f.framework ?? jobTypeProfile?.bulletFramework ?? 'metric',
      employerId: f.employerId ?? '',
      dateRange: f.dateRange ?? '',
      sectionTarget: f.sectionTarget ?? 'experience',
      situation: f.situation ?? '',
      task: f.task ?? '',
      action: f.action ?? '',
      result: f.result ?? '',
    })),
  };
}

export async function generateFollowUp(
  roleProfile: RoleIntelligenceProfile,
  evaluation: AnswerEvaluation,
  originalQuestion: string,
  jobTypeProfile?: JobTypeProfile | null
): Promise<string> {
  if (evaluation.followUpQuestion?.trim()) return evaluation.followUpQuestion;

  const response = await getChatStrong().invoke([
    {
      role: 'system',
      content: `Generate a single focused follow-up. Demand measurable detail (%, timeline, team size, tools). Framework: ${jobTypeProfile?.bulletFramework ?? 'CAR'}.`,
    },
    {
      role: 'user',
      content: `Role: ${roleProfile.archetype}. Original Q: ${originalQuestion}. completeness=${evaluation.completeness}, specificity=${evaluation.specificity}, hasMetrics=${evaluation.hasMetrics}`,
    },
  ]);

  return typeof response.content === 'string' ? response.content : String(response.content);
}

export async function summarizeInterview(interview: InterviewState): Promise<string> {
  const response = await getChatStrong().invoke([
    {
      role: 'system',
      content: 'Summarize interview progress in 2-3 sentences for context compression.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        messages: interview.messages.slice(-10),
        facts: interview.extractedFacts,
      }),
    },
  ]);
  return typeof response.content === 'string' ? response.content : String(response.content);
}

function isTopicAddressed(
  interview: InterviewState,
  gapId: string
): boolean {
  const covered = interview.topicCoverage.some(
    (t) => t.covered && (t.topicId === gapId || t.topic === gapId)
  );
  const skipped = (interview.probeQueue ?? []).some(
    (p) => p.topicId === gapId && p.status === 'skipped'
  );
  const limited = (interview.limitations ?? []).some((l) => l.topicId === gapId);
  return covered || skipped || limited;
}

export function checkInterviewSufficiency(
  interview: InterviewState,
  matchReport: MatchReport | null
): boolean {
  const maxTurns = 25;
  const routing = matchReport?.routingRecommendation;
  const minTurns =
    routing === 'interview_full' ? 6 : routing === 'interview_targeted' ? 4 : 5;

  const limitationCount = interview.limitations?.length ?? 0;
  let minFacts = routing === 'interview_full' ? 8 : 5;
  let minWithMetrics = routing === 'interview_full' ? 3 : 2;
  if (limitationCount >= 2) {
    minFacts = Math.min(minFacts, 2);
    minWithMetrics = 0;
  }

  if (interview.userRequestedFinish && interview.turnCount >= 2) return true;
  if (interview.turnCount >= maxTurns) return true;

  const factsWithMetrics = interview.extractedFacts.filter(
    (f) => (f.metrics?.length ?? 0) > 0 || /\d/.test(f.text)
  ).length;

  const pendingProbes = (interview.probeQueue ?? []).filter(
    (p) => p.status === 'pending' || p.status === 'in_progress'
  ).length;

  if (interview.turnCount < minTurns) return false;

  const hasDeclines = limitationCount > 0;
  if (pendingProbes > 0 && interview.turnCount < minTurns + 2 && !hasDeclines) return false;

  if (interview.extractedFacts.length < minFacts && !hasDeclines) return false;
  if (factsWithMetrics < minWithMetrics && !hasDeclines) return false;

  const criticalGaps =
    matchReport?.gaps.filter((g) => g.severity === 'critical') ?? [];
  if (criticalGaps.length > 0) {
    const uncovered = criticalGaps.filter(
      (g) => !isTopicAddressed(interview, g.id) && g.category !== 'date'
    );
    if (uncovered.length > 0 && interview.turnCount < minTurns + 3 && !hasDeclines) {
      return false;
    }
  }

  if (pendingProbes === 0) return true;
  if (hasDeclines && interview.turnCount >= minTurns) return true;

  return interview.turnCount >= minTurns + 2;
}

export function completionMessage(interview: InterviewState): string {
  if ((interview.limitations?.length ?? 0) > 0 || interview.userRequestedFinish) {
    return "We'll generate your CV with the information provided. Some sections may be omitted or less tailored. You can proceed to generate your optimized resume.";
  }
  return 'Thank you — I have enough detail to tailor your CV. You can proceed to generate your optimized resume.';
}

export async function streamInterviewReply(
  systemContext: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
) {
  const chat = createStreamingChat();
  return chat.stream([
    { role: 'system', content: systemContext },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]);
}
