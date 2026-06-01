import type { CandidateProfile } from '@/src/ai/schemas/candidateProfile.schema';
import type { JobTypeProfile } from '@/src/ai/schemas/jobTypeProfile.schema';
import type { MatchReport } from '@/src/ai/schemas/matchReport.schema';
import type { InterviewProbe, InterviewLimitation } from '@/src/ai/schemas/interview.schema';
import { detectDateGaps } from '@/src/ai/utils/dateGapDetector';

export function buildInterviewProbeQueue(
  profile: CandidateProfile | null,
  matchReport: MatchReport | null,
  jobTypeProfile: JobTypeProfile | null
): InterviewProbe[] {
  const probes: InterviewProbe[] = [];
  let order = 0;

  const add = (
    kind: InterviewProbe['kind'],
    prompt: string,
    topicId: string
  ) => {
    probes.push({
      id: `probe_${order++}_${topicId}`,
      kind,
      prompt,
      topicId,
      status: 'pending',
    });
  };

  if (profile) {
    for (const gap of detectDateGaps(profile)) {
      const which =
        gap.field === 'startDate'
          ? 'start'
          : gap.field === 'endDate'
            ? 'end'
            : 'completion';
      add(
        'date',
        `What month and year did you ${which} ${gap.label}?` +
          (gap.currentValue ? ` (CV shows: ${gap.currentValue})` : ''),
        gap.id
      );
    }
  }

  if (matchReport) {
    const ranked = [...matchReport.gaps].sort((a, b) => {
      const sev = { critical: 0, moderate: 1, minor: 2 };
      return sev[a.severity] - sev[b.severity];
    });
    for (const g of ranked) {
      if (g.severity === 'minor') continue;
      const id = g.id || `gap_${g.requirement.slice(0, 30)}`;
      add(
        'gap',
        `The role requires: "${g.requirement}". ${g.suggestion || 'Describe a specific example with metrics (numbers, %, team size, timeline).'}`,
        id
      );
    }
  }

  if (jobTypeProfile) {
    for (const trait of jobTypeProfile.implicitTraitsToProbe) {
      add('trait', trait.evidenceQuestion, `trait_${trait.trait}`);
    }

    const hasProjects = (profile?.projects?.length ?? 0) > 0;
    const needsProjects = jobTypeProfile.requiredSections.some(
      (s) => s.id === 'projects' && s.required
    );
    if (needsProjects && !hasProjects) {
      add(
        'section',
        'Describe one project relevant to this role: goal, your role, tech/tools, and measurable outcome.',
        'section_projects'
      );
    }

    const needsCerts = jobTypeProfile.requiredSections.some(
      (s) => s.id === 'certifications' && s.required
    );
    if (needsCerts && (profile?.certifications?.length ?? 0) === 0) {
      add(
        'section',
        'List any licenses or certifications you hold for this role (name, issuer, month/year obtained).',
        'section_certifications'
      );
    }

    const needsPortfolio = jobTypeProfile.requiredSections.some(
      (s) => s.id === 'portfolio' && s.required
    );
    if (needsPortfolio && !profile?.personalInfo?.portfolioUrl) {
      add(
        'section',
        'Share a portfolio or GitHub URL, or describe your best work sample for this role.',
        'section_portfolio'
      );
    }
  }

  if (probes.length === 0) {
    add(
      'achievement',
      'Describe your most relevant achievement for this role using specific metrics (%, revenue, time saved, users, team size).',
      'achievement_default'
    );
  }

  return probes;
}

export function nextProbe(
  queue: InterviewProbe[],
  currentProbeId?: string
): InterviewProbe | null {
  if (currentProbeId) {
    const current = queue.find((p) => p.id === currentProbeId);
    if (current && current.status === 'in_progress') return current;
  }
  return queue.find((p) => p.status === 'pending') ?? null;
}

export function markProbeDone(queue: InterviewProbe[], probeId: string): InterviewProbe[] {
  return queue.map((p) =>
    p.id === probeId ? { ...p, status: 'done' as const } : p
  );
}

export function markProbeSkipped(queue: InterviewProbe[], probeId: string): InterviewProbe[] {
  return queue.map((p) =>
    p.id === probeId ? { ...p, status: 'skipped' as const } : p
  );
}

export function implicationForProbe(
  probe: InterviewProbe,
  jobTypeProfile?: import('@/src/ai/schemas/jobTypeProfile.schema').JobTypeProfile | null
): string {
  switch (probe.kind) {
    case 'date':
      return 'Without exact months, your CV will show year-only dates, which may look less precise to recruiters.';
    case 'gap':
      return `Without details on "${probe.topicId.replace(/^gap_/, '')}", that requirement may be underrepresented on your CV.`;
    case 'trait':
      return 'Without a concrete example, soft-skill claims may be weaker on your tailored CV.';
    case 'section':
      if (probe.topicId.includes('projects')) {
        return 'Without project examples, the Projects section may be omitted or thin — common for SWE roles.';
      }
      if (probe.topicId.includes('certifications')) {
        return 'Without certification details, license-required roles may see you as less qualified on paper.';
      }
      if (probe.topicId.includes('portfolio')) {
        return 'Without a portfolio link, technical roles may have less evidence of your work.';
      }
      return 'This section may be omitted from your generated CV.';
    case 'achievement':
      return 'Without measurable achievements, experience bullets may be less compelling.';
    default:
      return jobTypeProfile
        ? `Some ${jobTypeProfile.jobType.replace(/_/g, ' ')} CV sections may be less tailored.`
        : 'Some CV sections may be omitted or less tailored.';
  }
}

export function limitationsSummaryLabel(limitations: InterviewLimitation[]): string {
  if (!limitations.length) return '';
  const kinds = [...new Set(limitations.map((l) => l.probeKind))];
  const labels = kinds.map((k) => {
    switch (k) {
      case 'date':
        return 'exact dates';
      case 'section':
        return 'optional sections';
      case 'trait':
        return 'soft-skill examples';
      case 'gap':
        return 'role requirements';
      default:
        return 'details';
    }
  });
  return `${limitations.length} item${limitations.length > 1 ? 's' : ''} skipped — CV may omit ${labels.slice(0, 2).join(', ')}`;
}

export function probeProgressLabel(queue: InterviewProbe[]): string {
  const pending = queue.filter((p) => p.status === 'pending' || p.status === 'in_progress');
  if (!pending.length) return 'Interview complete';
  const labels = pending.slice(0, 3).map((p) => {
    switch (p.kind) {
      case 'date':
        return 'dates';
      case 'gap':
        return 'role requirements';
      case 'trait':
        return 'soft skills';
      case 'section':
        return p.topicId.replace('section_', '');
      default:
        return 'achievements';
    }
  });
  return `Gathering: ${labels.join(', ')}`;
}
