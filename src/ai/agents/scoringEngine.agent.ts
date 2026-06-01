import { getChatStrong } from '@/src/infrastructure/llm/openai.client';
import { MatchReportSchema, type MatchReport } from '@/src/ai/schemas/matchReport.schema';
import type { RoleIntelligenceProfile } from '@/src/ai/schemas/roleProfile.schema';
import type { CandidateProfile } from '@/src/ai/schemas/candidateProfile.schema';
import type { JobTypeProfile } from '@/src/ai/schemas/jobTypeProfile.schema';
import { semanticSimilarity } from '@/src/ai/tools/embed.tool';
import { detectDateGaps } from '@/src/ai/utils/dateGapDetector';

const DIMENSION_WEIGHTS = {
  semanticAlignment: 0.35,
  competencyInference: 0.25,
  experienceRelevance: 0.15,
  seniorityAlignment: 0.1,
  industryDomainFit: 0.1,
  achievementQuality: 0.05,
  atsKeywordCoverage: 0.05,
};

function buildCvSummary(profile: CandidateProfile): string {
  const exp = profile.experience
    .map((e) => `${e.position} at ${e.company}: ${e.bullets.join('; ')}`)
    .join('\n');
  const projects = (profile.projects ?? [])
    .map((p) => `${p.name}: ${p.description}`)
    .join('\n');
  return `${profile.personalInfo.summary ?? ''}\nSkills: ${profile.skills.join(', ')}\n${exp}\n${projects}`;
}

function buildJdSummary(role: RoleIntelligenceProfile): string {
  return [
    role.title,
    role.industry,
    role.seniority,
    ...role.hardRequirements,
    ...role.softRequirements,
    ...role.hiddenExpectations,
  ]
    .filter(Boolean)
    .join('\n');
}

function normalizeGaps(
  gaps: Array<{
    id?: string;
    requirement: string;
    severity: 'critical' | 'moderate' | 'minor';
    suggestion: string;
    category?: MatchReport['gaps'][0]['category'];
    relatedTrait?: string;
  }>
): MatchReport['gaps'] {
  return gaps.map((g, i) => ({
    id: g.id?.trim() ? g.id : `gap_${i}_${g.requirement.slice(0, 20).replace(/\W/g, '_')}`,
    requirement: g.requirement,
    severity: g.severity,
    suggestion: g.suggestion,
    category: g.category ?? 'skill',
    relatedTrait: g.relatedTrait ?? '',
  }));
}

export async function scoreMatch(
  roleProfile: RoleIntelligenceProfile,
  candidateProfile: CandidateProfile,
  jobDescriptionRaw: string,
  resumeRawText: string | null,
  jobTypeProfile?: JobTypeProfile | null
): Promise<MatchReport> {
  const cvText = resumeRawText ?? buildCvSummary(candidateProfile);
  const semanticScore = await semanticSimilarity(buildJdSummary(roleProfile), cvText);

  const structured = getChatStrong().withStructuredOutput(MatchReportSchema, {
    name: 'match_report',
  });

  const report = await structured.invoke([
    {
      role: 'system',
      content: `You are an expert recruiter scoring candidate-job fit. Use semantic understanding — not keyword matching alone.
Each gap must have category: skill | experience | trait | certification | date | section.
For implicit JD traits (leadership, hardworking, etc.) use category trait and relatedTrait.
Include date gaps for missing month/year on roles. Include section gaps when required CV sections are empty.
Precomputed semantic similarity: ${semanticScore.toFixed(3)}.`,
    },
    {
      role: 'user',
      content: JSON.stringify(
        {
          roleProfile,
          jobTypeProfile,
          candidateProfile,
          jobDescriptionRaw: jobDescriptionRaw.slice(0, 4000),
          cvText: cvText.slice(0, 8000),
          dateGaps: detectDateGaps(candidateProfile),
          traitsToProbe: jobTypeProfile?.implicitTraitsToProbe,
          embeddingSemanticScore: semanticScore,
          dimensionWeights: DIMENSION_WEIGHTS,
        },
        null,
        2
      ),
    },
  ]);

  const blendedSemantic = Math.min(
    1,
    report.dimensions.semanticAlignment.score * 0.7 + semanticScore * 0.3
  );
  report.dimensions.semanticAlignment.score = blendedSemantic;

  const dims = report.dimensions;
  const weighted =
    dims.semanticAlignment.score * DIMENSION_WEIGHTS.semanticAlignment +
    dims.competencyInference.score * DIMENSION_WEIGHTS.competencyInference +
    dims.experienceRelevance.score * DIMENSION_WEIGHTS.experienceRelevance +
    dims.seniorityAlignment.score * DIMENSION_WEIGHTS.seniorityAlignment +
    dims.industryDomainFit.score * DIMENSION_WEIGHTS.industryDomainFit +
    dims.achievementQuality.score * DIMENSION_WEIGHTS.achievementQuality +
    dims.atsKeywordCoverage.score * DIMENSION_WEIGHTS.atsKeywordCoverage;

  report.overallFit = Math.round(weighted * 100);

  if (report.overallFit < 55) report.routingRecommendation = 'interview_full';
  else if (report.overallFit < 75) report.routingRecommendation = 'interview_targeted';
  else report.routingRecommendation = 'generate';

  return {
    ...report,
    gaps: normalizeGaps(report.gaps),
    strengths: report.strengths.map((s) => ({
      text: s.text,
      source: s.source,
      dimension: s.dimension ?? '',
    })),
  };
}
