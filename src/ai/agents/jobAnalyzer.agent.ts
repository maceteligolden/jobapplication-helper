import { getChatStrong } from '@/src/infrastructure/llm/openai.client';
import {
  RoleIntelligenceProfileSchema,
  type RoleIntelligenceProfile,
} from '@/src/ai/schemas/roleProfile.schema';
import type { JobTypeProfile } from '@/src/ai/schemas/jobTypeProfile.schema';

export async function analyzeRole(
  jobDescriptionRaw: string,
  jobTypeProfile?: JobTypeProfile | null
): Promise<RoleIntelligenceProfile> {
  const structured = getChatStrong().withStructuredOutput(RoleIntelligenceProfileSchema, {
    name: 'role_intelligence_profile',
  });

  const result = await structured.invoke([
    {
      role: 'system',
      content: `You are an expert recruiter and workforce analyst. Parse job descriptions deeply.
Infer soft skills, hidden expectations, seniority, role archetype (engineering/academic/executive/corporate/creative/other),
industry, hiring priorities, and success metrics — not just explicit keywords.
Align sectionPriority with the provided jobType section plan when available.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        jobDescription: jobDescriptionRaw,
        jobType: jobTypeProfile?.jobType,
        suggestedSections: jobTypeProfile?.requiredSections?.map((s) => s.id),
        industryTags: jobTypeProfile?.industryTags,
      }),
    },
  ]);

  const sectionPriority =
    (result.sectionPriority?.length ?? 0) > 0
      ? result.sectionPriority ?? []
      : (jobTypeProfile?.requiredSections.map((s) => s.id) ?? ['experience', 'skills', 'education']);

  return {
    title: result.title ?? '',
    company: result.company ?? '',
    archetype: result.archetype,
    seniority: result.seniority,
    industry: result.industry,
    region: result.region ?? '',
    hardRequirements: result.hardRequirements ?? [],
    softRequirements: result.softRequirements ?? [],
    hiddenExpectations: result.hiddenExpectations ?? [],
    successMetrics: result.successMetrics ?? [],
    hiringPriorities: result.hiringPriorities ?? [],
    keySkills: result.keySkills ?? [],
    writingTone: result.writingTone,
    sectionPriority,
    keywords: result.keywords ?? [],
  };
}
