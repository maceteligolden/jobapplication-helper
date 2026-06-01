import type { CVWorkflowState } from './state';
import type { InterviewState, InterviewProbe } from '@/src/ai/schemas/interview.schema';
import type { CandidateProfile, Achievement } from '@/src/ai/schemas/candidateProfile.schema';
import {
  evaluateAnswer,
  generateFollowUp,
  summarizeInterview,
  checkInterviewSufficiency,
  generateOpeningQuestion,
  createInitialInterviewState,
  detectDeclineIntent,
  detectFinishIntent,
  completionMessage,
} from '@/src/ai/agents/interview.agent';
import {
  buildInterviewProbeQueue,
  nextProbe,
  markProbeDone,
  markProbeSkipped,
  implicationForProbe,
  probeProgressLabel,
  limitationsSummaryLabel,
} from '@/src/ai/interview/interviewPlanner';

export interface InterviewTurnResult {
  interview: InterviewState;
  assistantMessage: string;
  isComplete: boolean;
  candidateProfile?: CandidateProfile;
  probeProgress?: string;
  limitationsSummary?: string;
}

function formatStarText(f: {
  text: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
}): string {
  if (f.situation && f.action && f.result) {
    return `${f.situation} ${f.task ? `Task: ${f.task} ` : ''}Action: ${f.action} Result: ${f.result}`.trim();
  }
  return f.text;
}

function recordDecline(
  interview: InterviewState,
  currentProbe: InterviewProbe | undefined,
  implication: string,
  state: CVWorkflowState
): void {
  const topicKey = currentProbe?.topicId ?? 'unknown';
  const probeKind = currentProbe?.kind ?? 'achievement';

  if (currentProbe) {
    interview.probeQueue = markProbeSkipped(interview.probeQueue, currentProbe.id);
  }

  const implicationText =
    implication.trim() ||
    (currentProbe
      ? implicationForProbe(currentProbe, state.jobTypeProfile)
      : 'Some CV sections may be omitted or less tailored.');

  interview.limitations = [
    ...(interview.limitations ?? []),
    {
      topicId: topicKey,
      probeKind,
      implication: implicationText,
      declinedAt: new Date().toISOString(),
    },
  ];

  const existing = interview.topicCoverage.find(
    (t) => t.topicId === topicKey || t.topic === topicKey
  );
  if (existing) {
    existing.covered = true;
    existing.quality = 0;
  } else {
    interview.topicCoverage.push({
      topic: topicKey.slice(0, 40),
      topicId: topicKey,
      covered: true,
      quality: 0,
      attempts: 0,
    });
  }
}

export async function processInterviewMessage(
  state: CVWorkflowState,
  userMessage: string
): Promise<InterviewTurnResult> {
  if (!state.roleProfile) {
    throw new Error('Role profile required for interview');
  }

  let interview: InterviewState = state.interview ?? createInitialInterviewState();
  interview.limitations = interview.limitations ?? [];

  if (!interview.probeQueue?.length) {
    interview.probeQueue = buildInterviewProbeQueue(
      state.resumeStructured,
      state.matchReport,
      state.jobTypeProfile
    );
  }

  if (detectFinishIntent(userMessage)) {
    interview.userRequestedFinish = true;
  }

  const lastAssistant = [...interview.messages].reverse().find((m) => m.role === 'assistant');
  const currentQuestion = lastAssistant?.content ?? 'Tell me about your experience.';
  const currentProbe = interview.probeQueue.find((p) => p.id === interview.currentProbeId);

  interview.messages.push({
    id: `msg_${Date.now()}_user`,
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  });
  interview.turnCount += 1;

  const evaluation = await evaluateAnswer(
    state.roleProfile,
    currentQuestion,
    userMessage,
    interview,
    state.jobTypeProfile
  );

  if (!evaluation.userDeclined && !detectDeclineIntent(userMessage)) {
    for (const fact of evaluation.extractedFacts) {
      const text = formatStarText(fact);
      interview.extractedFacts.push({
        id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text,
        source: 'interview',
        sourceId: fact.employerId || interview.messages[interview.messages.length - 1]?.id,
        confidence: Math.min(1, (evaluation.completeness + evaluation.specificity) / 2),
        metrics: fact.metrics,
        framework: fact.framework ?? 'metric',
        employerId: fact.employerId ?? '',
        dateRange: fact.dateRange ?? '',
        sectionTarget: fact.sectionTarget ?? 'experience',
      });
    }
  }

  let assistantMessage: string;

  if (evaluation.userDeclined || detectDeclineIntent(userMessage)) {
    recordDecline(
      interview,
      currentProbe,
      evaluation.implicationForCv,
      state
    );
    const implication =
      evaluation.implicationForCv?.trim() ||
      (currentProbe
        ? implicationForProbe(currentProbe, state.jobTypeProfile)
        : 'Some details will be omitted from your CV.');
    const nextPrompt = await advanceToNextProbe(state, interview);
    assistantMessage = `No problem — ${implication} Let's move on: ${nextPrompt}`;
  } else if (evaluation.isOffTopic) {
    assistantMessage = `That's helpful context — focusing on your fit for this ${state.roleProfile.archetype} role: ${await generateFollowUp(state.roleProfile, evaluation, currentQuestion, state.jobTypeProfile)}`;
  } else if (evaluation.followUpNeeded) {
    const topicKey = currentProbe?.topicId ?? currentQuestion.slice(0, 40);
    const topicAttempts =
      interview.topicCoverage.find((t) => t.topicId === topicKey || t.topic === topicKey)
        ?.attempts ?? 0;
    if (topicAttempts < 2) {
      assistantMessage = await generateFollowUp(
        state.roleProfile,
        evaluation,
        currentQuestion,
        state.jobTypeProfile
      );
      const existing = interview.topicCoverage.find(
        (t) => t.topicId === topicKey || t.topic === topicKey
      );
      if (existing) existing.attempts += 1;
      else
        interview.topicCoverage.push({
          topic: currentQuestion.slice(0, 40),
          topicId: topicKey,
          covered: false,
          quality: evaluation.completeness,
          attempts: 1,
        });
    } else {
      assistantMessage = await advanceToNextProbe(state, interview);
    }
  } else {
    if (currentProbe) {
      interview.probeQueue = markProbeDone(interview.probeQueue, currentProbe.id);
      const topicKey = currentProbe.topicId;
      const existing = interview.topicCoverage.find((t) => t.topicId === topicKey);
      if (existing) {
        existing.covered = true;
        existing.quality = Math.max(existing.quality, evaluation.completeness);
      } else {
        interview.topicCoverage.push({
          topic: currentProbe.prompt.slice(0, 40),
          topicId: topicKey,
          covered: true,
          quality: evaluation.completeness,
          attempts: 1,
        });
      }
    }
    assistantMessage = await advanceToNextProbe(state, interview);
  }

  interview.messages.push({
    id: `msg_${Date.now()}_assistant`,
    role: 'assistant',
    content: assistantMessage,
    timestamp: new Date().toISOString(),
  });

  if (interview.turnCount % 5 === 0) {
    interview.summary = await summarizeInterview(interview);
  }

  const isComplete = checkInterviewSufficiency(interview, state.matchReport);
  interview.isComplete = isComplete;

  if (isComplete) {
    assistantMessage = completionMessage(interview);
    interview.messages[interview.messages.length - 1].content = assistantMessage;
    interview.probeQueue = interview.probeQueue.map((p) =>
      p.status === 'pending' ? { ...p, status: 'skipped' as const } : p
    );
  }

  const candidateProfile = mergeFactsIntoProfile(state.resumeStructured, interview);

  return {
    interview,
    assistantMessage,
    isComplete,
    candidateProfile,
    probeProgress: probeProgressLabel(interview.probeQueue),
    limitationsSummary: limitationsSummaryLabel(interview.limitations ?? []),
  };
}

async function advanceToNextProbe(
  state: CVWorkflowState,
  interview: InterviewState
): Promise<string> {
  const probe = nextProbe(interview.probeQueue, interview.currentProbeId);
  if (!probe) {
    return wrapUpWhenNoProbes(interview);
  }
  interview.probeQueue = interview.probeQueue.map((p) =>
    p.id === probe.id ? { ...p, status: 'in_progress' as const } : p
  );
  interview.currentProbeId = probe.id;
  interview.currentTopic = probe.prompt;
  return probe.prompt;
}

function wrapUpWhenNoProbes(interview: InterviewState): string {
  if ((interview.limitations?.length ?? 0) > 0) {
    return "That's everything I needed for now. You can add more detail if you'd like, or proceed to generate your CV with what we have.";
  }
  return "That's everything I needed. You can proceed to generate your optimized CV whenever you're ready.";
}

function applyDateFromInterview(
  profile: CandidateProfile,
  fact: Achievement
): CandidateProfile {
  if (!fact.dateRange?.trim()) return profile;

  const range = fact.dateRange.trim();
  const exp = profile.experience.find((e) => e.id === fact.employerId);
  if (exp) {
    if (fact.text.toLowerCase().includes('start')) {
      exp.startDate = range;
      exp.startDatePrecision = 'month';
    } else if (fact.text.toLowerCase().includes('end')) {
      exp.endDate = range;
      exp.endDatePrecision = 'month';
    }
    return profile;
  }

  return profile;
}

export function mergeFactsIntoProfile(
  existing: CandidateProfile | null,
  interview: InterviewState
): CandidateProfile {
  const base: CandidateProfile = existing ?? {
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedIn: '',
      summary: '',
      portfolioUrl: '',
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    achievements: [],
    inferredSeniority: 'mid',
    rawText: '',
  };

  let profile: CandidateProfile = { ...base, experience: [...base.experience] };

  const newAchievements = interview.extractedFacts.filter(
    (f) => !profile.achievements.some((a) => a.text === f.text)
  );

  for (const fact of interview.extractedFacts) {
    profile = applyDateFromInterview(profile, fact);

    if (fact.sectionTarget === 'projects' && fact.text) {
      const exists = profile.projects.some((p) =>
        p.bullets.some((b) => b === fact.text)
      );
      if (!exists) {
        const projectId = fact.employerId || `proj_${Date.now()}`;
        const existingProj = profile.projects.find((p) => p.id === projectId);
        if (existingProj) {
          existingProj.bullets = [...existingProj.bullets, fact.text];
        } else {
          profile.projects.push({
            id: projectId,
            name: 'Interview project',
            description: '',
            technologies: [],
            url: '',
            bullets: [fact.text],
          });
        }
      }
    }

    if (fact.sectionTarget === 'certifications' && fact.text) {
      if (!profile.certifications.some((c) => c.name === fact.text)) {
        profile.certifications.push({
          id: `cert_${Date.now()}`,
          name: fact.text,
          issuer: '',
          date: fact.dateRange || '',
          datePrecision: fact.dateRange ? 'month' : 'unknown',
        });
      }
    }

    if (fact.sectionTarget === 'experience' && fact.employerId) {
      const exp = profile.experience.find((e) => e.id === fact.employerId);
      if (exp && !exp.bullets.includes(fact.text)) {
        exp.bullets.push(fact.text);
      }
    }
  }

  return {
    ...profile,
    rawText: profile.rawText || existing?.rawText || '',
    achievements: [...profile.achievements, ...newAchievements],
  };
}

export async function initInterviewIfNeeded(state: CVWorkflowState): Promise<InterviewTurnResult> {
  if (state.interview?.messages.length) {
    const interview = { ...state.interview };
    interview.limitations = interview.limitations ?? [];
    if (interview.turnCount < 3) {
      interview.isComplete = false;
      const last = interview.messages[interview.messages.length - 1];
      if (
        last?.role === 'assistant' &&
        (last.content.startsWith('Thank you — I have enough detail') ||
          last.content.startsWith("We'll generate your CV"))
      ) {
        interview.messages = interview.messages.slice(0, -1);
      }
    }
    const last = interview.messages[interview.messages.length - 1];
    return {
      interview,
      assistantMessage:
        last?.content ?? 'Tell me about your most relevant experience for this role.',
      isComplete: interview.isComplete,
      probeProgress: probeProgressLabel(interview.probeQueue ?? []),
      limitationsSummary: limitationsSummaryLabel(interview.limitations ?? []),
    };
  }

  if (!state.roleProfile) throw new Error('Analyze job before interview');

  const interview = createInitialInterviewState();
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
    interview.probeQueue = interview.probeQueue.map((p) =>
      p.id === firstProbe.id ? { ...p, status: 'in_progress' as const } : p
    );
    interview.currentProbeId = firstProbe.id;
    interview.currentTopic = firstProbe.prompt;
  }

  interview.messages.push({
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content: opening,
    timestamp: new Date().toISOString(),
  });

  return {
    interview,
    assistantMessage: opening,
    isComplete: false,
    probeProgress: probeProgressLabel(interview.probeQueue),
    limitationsSummary: '',
  };
}
