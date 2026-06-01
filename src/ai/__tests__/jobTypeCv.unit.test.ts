import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getStandardsForJobType, mergeJobTypeProfile } from '@/src/ai/standards/cvWritingStandards';
import { detectDateGaps, inferDatePrecision } from '@/src/ai/utils/dateGapDetector';
import { renderCvFromSections } from '@/src/ai/utils/renderCvFromSections';
import {
  buildInterviewProbeQueue,
  markProbeSkipped,
} from '@/src/ai/interview/interviewPlanner';
import {
  detectDeclineIntent,
  checkInterviewSufficiency,
  createInitialInterviewState,
} from '@/src/ai/agents/interview.agent';
import type { MatchReport } from '@/src/ai/schemas/matchReport.schema';
import type { CandidateProfile } from '@/src/ai/schemas/candidateProfile.schema';
import type { JobTypeProfile } from '@/src/ai/schemas/jobTypeProfile.schema';

describe('cvWritingStandards', () => {
  it('returns STAR framework for software_engineering', () => {
    const s = getStandardsForJobType('software_engineering');
    assert.equal(s.bulletFramework, 'STAR');
    assert.ok(s.requiredSections.some((x) => x.id === 'projects'));
  });

  it('merges low-confidence classifier with defaults', () => {
    const merged = mergeJobTypeProfile({
      jobType: 'warehouse_operations',
      confidence: 0.5,
      industryTags: [],
      bulletFramework: 'duty_metric',
      requiredSections: [],
      optionalSections: [],
      implicitTraitsToProbe: [],
    });
    assert.ok(merged.requiredSections.length > 0);
  });
});

describe('dateGapDetector', () => {
  it('detects year-only start dates', () => {
    const profile: CandidateProfile = {
      personalInfo: {
        fullName: 'A',
        email: '',
        phone: '',
        location: '',
        linkedIn: '',
        summary: '',
        portfolioUrl: '',
      },
      experience: [
        {
          id: 'e1',
          company: 'Co',
          position: 'Dev',
          startDate: '2020',
          endDate: 'Jan 2024',
          current: false,
          startDatePrecision: 'year',
          endDatePrecision: 'month',
          bullets: [],
          technologies: [],
        },
      ],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      achievements: [],
      inferredSeniority: 'mid',
      rawText: '',
    };
    const gaps = detectDateGaps(profile);
    assert.ok(gaps.some((g) => g.kind === 'experience_start'));
    assert.equal(inferDatePrecision('Jan 2022'), 'month');
    assert.equal(inferDatePrecision('2020'), 'year');
  });
});

describe('renderCvFromSections', () => {
  it('renders sections in plan order', () => {
    const text = renderCvFromSections(
      [
        { id: 'skills', title: 'Skills', content: 'TypeScript' },
        { id: 'experience', title: 'Experience', content: 'Dev at Co' },
      ],
      [
        { id: 'experience', title: 'Experience', required: true, reason: '' },
        { id: 'skills', title: 'Skills', required: true, reason: '' },
      ]
    );
    assert.ok(text.indexOf('EXPERIENCE') < text.indexOf('SKILLS'));
  });
});

describe('interviewPlanner', () => {
  it('queues trait probes from job type profile', () => {
    const jobType: JobTypeProfile = {
      jobType: 'software_engineering',
      confidence: 0.9,
      industryTags: ['fintech'],
      bulletFramework: 'STAR',
      requiredSections: [
        { id: 'projects', title: 'Projects', required: true, reason: 'JD' },
      ],
      optionalSections: [],
      implicitTraitsToProbe: [
        {
          trait: 'leadership',
          jdSignal: 'lead team',
          evidenceQuestion: 'Describe a time you led a team.',
          resumeSection: 'experience',
        },
      ],
    };
    const queue = buildInterviewProbeQueue(null, null, jobType);
    assert.ok(queue.some((p) => p.kind === 'trait'));
    assert.ok(queue.some((p) => p.kind === 'section'));
  });

  it('markProbeSkipped sets probe status to skipped', () => {
    const queue = buildInterviewProbeQueue(null, null, null);
    const first = queue[0];
    assert.ok(first);
    const updated = markProbeSkipped(queue, first.id);
    assert.equal(updated.find((p) => p.id === first.id)?.status, 'skipped');
  });
});

describe('interviewDecline', () => {
  it('detectDeclineIntent matches common skip phrases', () => {
    assert.equal(detectDeclineIntent("I don't know"), true);
    assert.equal(detectDeclineIntent('please skip this'), true);
    assert.equal(detectDeclineIntent('not applicable'), true);
    assert.equal(detectDeclineIntent('let us move on'), true);
    assert.equal(detectDeclineIntent('I led a team of 5 engineers'), false);
  });

  it('checkInterviewSufficiency completes when user requests finish after 2 turns', () => {
    const interview = createInitialInterviewState();
    interview.userRequestedFinish = true;
    interview.turnCount = 2;
    assert.equal(checkInterviewSufficiency(interview, null), true);
  });

  it('skipped probe counts as addressed for critical-gap gate', () => {
    const dim = {
      score: 0.5,
      weight: 1,
      reasoning: 'test',
      evidence: [] as string[],
    };
    const matchReport: MatchReport = {
      overallFit: 60,
      dimensions: {
        semanticAlignment: dim,
        competencyInference: dim,
        experienceRelevance: dim,
        seniorityAlignment: dim,
        industryDomainFit: dim,
        achievementQuality: dim,
        atsKeywordCoverage: dim,
      },
      gaps: [
        {
          id: 'gap_leadership',
          category: 'trait',
          requirement: 'Leadership',
          severity: 'critical',
          suggestion: 'Add leadership examples',
          relatedTrait: 'leadership',
        },
      ],
      strengths: [],
      improvementActions: [],
      routingRecommendation: 'interview_targeted',
      confidence: 0.8,
    };
    const interview = createInitialInterviewState();
    interview.turnCount = 5;
    interview.probeQueue = [
      {
        id: 'probe_0_gap_leadership',
        kind: 'gap',
        prompt: 'Describe leadership',
        topicId: 'gap_leadership',
        status: 'skipped',
      },
    ];
    const fact = {
      text: 'Built API with measurable impact',
      metrics: ['10%'],
      framework: 'STAR' as const,
      employerId: '',
      dateRange: '',
      sectionTarget: 'experience',
    };
    interview.extractedFacts = Array.from({ length: 5 }, () => ({ ...fact }));
    assert.equal(checkInterviewSufficiency(interview, matchReport), true);
  });
});
