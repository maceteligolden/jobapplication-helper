import { getChatStrong } from '@/src/infrastructure/llm/openai.client';
import {
  JobTypeProfileSchema,
  type JobTypeProfile,
} from '@/src/ai/schemas/jobTypeProfile.schema';
import type { RoleIntelligenceProfile } from '@/src/ai/schemas/roleProfile.schema';
import { mergeJobTypeProfile } from '@/src/ai/standards/cvWritingStandards';

export async function classifyJobType(
  jobDescriptionRaw: string,
  roleProfile?: RoleIntelligenceProfile | null
): Promise<JobTypeProfile> {
  const structured = getChatStrong().withStructuredOutput(JobTypeProfileSchema, {
    name: 'job_type_profile',
  });

  const result = await structured.invoke([
    {
      role: 'system',
      content: `You classify job postings into a jobType and CV writing standards.
Identify operational vs knowledge work (warehouse, retail, clinical, engineering, analyst, etc.).
Choose bulletFramework: STAR for engineering/analytics projects, CAR for business/sales, PAR for clinical/academic, duty_metric for warehouse/retail ops.
List requiredSections with id from: summary, experience, skills, technical_skills, projects, education, certifications, portfolio, availability, tools, publications, other.
For each soft skill in the JD (leadership, hardworking, team player, communication), add implicitTraitsToProbe with a concrete evidenceQuestion the interviewer should ask.
Never use generic probes — tie each question to JD wording.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        jobDescription: jobDescriptionRaw.slice(0, 12000),
        roleHints: roleProfile
          ? {
              archetype: roleProfile.archetype,
              seniority: roleProfile.seniority,
              industry: roleProfile.industry,
              softRequirements: roleProfile.softRequirements,
              hiddenExpectations: roleProfile.hiddenExpectations,
            }
          : null,
      }),
    },
  ]);

  const normalized: JobTypeProfile = {
    jobType: result.jobType,
    confidence: result.confidence ?? 0.8,
    industryTags: result.industryTags ?? [],
    bulletFramework: result.bulletFramework,
    requiredSections: (result.requiredSections ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      required: s.required ?? true,
      reason: s.reason ?? '',
    })),
    optionalSections: (result.optionalSections ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      required: s.required ?? false,
      reason: s.reason ?? '',
    })),
    implicitTraitsToProbe: (result.implicitTraitsToProbe ?? []).map((t) => ({
      trait: t.trait,
      jdSignal: t.jdSignal ?? '',
      evidenceQuestion: t.evidenceQuestion,
      resumeSection: t.resumeSection,
    })),
  };

  return mergeJobTypeProfile(normalized);
}
