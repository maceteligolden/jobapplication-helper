import { getChatStrong } from '@/src/infrastructure/llm/openai.client';
import {
  GenerationArtifactSchema,
  type GenerationArtifact,
} from '@/src/ai/schemas/generation.schema';
import type { RoleIntelligenceProfile } from '@/src/ai/schemas/roleProfile.schema';
import type { CandidateProfile } from '@/src/ai/schemas/candidateProfile.schema';
import type { JobTypeProfile } from '@/src/ai/schemas/jobTypeProfile.schema';
import type { InterviewLimitation } from '@/src/ai/schemas/interview.schema';
import { renderCvFromSections } from '@/src/ai/utils/renderCvFromSections';
import { dateCompletenessSummary } from '@/src/ai/utils/dateGapDetector';

function collectFacts(candidateProfile: CandidateProfile) {
  return [
    ...candidateProfile.achievements.map((a) => ({
      text: a.text,
      source: a.source,
      sourceId: a.sourceId,
      framework: a.framework,
      sectionTarget: a.sectionTarget,
    })),
    ...candidateProfile.experience.flatMap((e) =>
      e.bullets.map((b) => ({
        text: b,
        source: 'cv' as const,
        sourceId: e.id,
        framework: 'metric' as const,
        sectionTarget: 'experience' as const,
      }))
    ),
    ...(candidateProfile.projects ?? []).flatMap((p) =>
      (p.bullets ?? []).map((b) => ({
        text: b,
        source: 'cv' as const,
        sourceId: p.id,
        framework: 'STAR' as const,
        sectionTarget: 'projects' as const,
      }))
    ),
  ];
}

const MONTH_YEAR_RE =
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}/gi;

export async function generateResumeArtifacts(
  roleProfile: RoleIntelligenceProfile,
  candidateProfile: CandidateProfile,
  jobDescriptionRaw: string,
  resumeRawText?: string | null,
  jobTypeProfile?: JobTypeProfile | null,
  interviewLimitations?: InterviewLimitation[] | null
): Promise<GenerationArtifact> {
  const structured = getChatStrong().withStructuredOutput(GenerationArtifactSchema, {
    name: 'generation_artifact',
  });

  const candidateSourceText =
    resumeRawText?.trim() || candidateProfile.rawText?.trim() || '';

  const facts = collectFacts(candidateProfile);
  const dateSummary = dateCompletenessSummary(candidateProfile);
  const bulletFramework = jobTypeProfile?.bulletFramework ?? 'CAR';
  const sectionPlan = jobTypeProfile?.requiredSections ?? [];

  if (!candidateSourceText && facts.length === 0) {
    throw new Error('No candidate CV content available for generation');
  }

  const raw = await structured.invoke([
    {
      role: 'system',
      content: `You are an expert CV writer. Generate a CANDIDATE'S resume tailored to a target role.

CRITICAL RULES:
- Output MUST be the candidate's CV — NOT the job description.
- Use ONLY facts from candidateResumeText and mustPreserveFacts. Do not invent employers, dates, or metrics.
- Job type: ${jobTypeProfile?.jobType ?? 'general'}. Bullet framework: ${bulletFramework} (STAR = Situation/Task/Action/Result per bullet).
- Include ONLY sections from sectionPlan that have supporting facts. Omit empty sections.
- If interviewLimitations lists omitted topics, do NOT invent content for those sections.
- Employment dates MUST use "MMM YYYY" (e.g. Jan 2022 – Mar 2024) when month is known in source data.
- Every experience bullet should include measurable impact where facts support it.

Populate the sections array with one entry per included section (id, title, content).
Also produce atsCv and humanCv as plain-text renditions of the same content.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        targetRole: {
          archetype: roleProfile.archetype,
          seniority: roleProfile.seniority,
          industry: roleProfile.industry,
          keySkills: roleProfile.keySkills,
          hardRequirements: roleProfile.hardRequirements,
          writingTone: roleProfile.writingTone,
          sectionPriority: roleProfile.sectionPriority,
        },
        jobType: jobTypeProfile?.jobType,
        bulletFramework,
        sectionPlan,
        optionalSections: jobTypeProfile?.optionalSections ?? [],
        candidateResumeText: candidateSourceText.slice(0, 14000),
        candidateProfileStructured: candidateProfile,
        mustPreserveFacts: facts,
        dateCompleteness: dateSummary,
        interviewLimitations: interviewLimitations ?? [],
        jobDescriptionForContextOnly: jobDescriptionRaw.slice(0, 2000),
      }),
    },
  ]);

  const looksLikeJd =
    candidateSourceText.length > 0 &&
    raw.atsCv.length > 0 &&
    raw.atsCv.slice(0, 200).toLowerCase() === jobDescriptionRaw.slice(0, 200).toLowerCase();

  if (looksLikeJd) {
    throw new Error('Generated output matched job description; retry with CV source');
  }

  const sections = (raw.sections ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    content: s.content,
  }));

  const renderedAts =
    sections.length > 0
      ? renderCvFromSections(sections, sectionPlan)
      : raw.atsCv;

  const atsCv = renderedAts || raw.atsCv;
  const humanCv = raw.humanCv || atsCv;

  if (dateSummary.gaps.length === 0) {
    const matches = atsCv.match(MONTH_YEAR_RE);
    if (!matches?.length && candidateProfile.experience.length > 0) {
      // soft warning only — still return output
    }
  }

  return {
    atsCv,
    humanCv,
    coverLetter: raw.coverLetter ?? '',
    sections,
    provenance: raw.provenance.map((p) => ({
      bulletText: p.bulletText,
      source: p.source,
      sourceId: p.sourceId ?? '',
      originalText: p.originalText ?? '',
    })),
  };
}

export async function generateCoverLetter(
  roleProfile: RoleIntelligenceProfile,
  candidateProfile: CandidateProfile,
  jobDescriptionRaw: string,
  atsCv: string
): Promise<string> {
  const response = await getChatStrong().invoke([
    {
      role: 'system',
      content: `Write a concise, professional cover letter. Only use facts from the CV. No invented claims.`,
    },
    {
      role: 'user',
      content: `Job:\n${jobDescriptionRaw.slice(0, 3000)}\n\nCV:\n${atsCv.slice(0, 4000)}`,
    },
  ]);
  return typeof response.content === 'string' ? response.content : String(response.content);
}
