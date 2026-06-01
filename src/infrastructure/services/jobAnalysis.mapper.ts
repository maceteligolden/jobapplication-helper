import type { RoleIntelligenceProfile } from '@/src/ai/schemas/roleProfile.schema';
import type { JobAnalysis } from './jobAnalyzer.service';

export function roleProfileToJobAnalysis(role: RoleIntelligenceProfile): JobAnalysis {
  return {
    businessType: role.industry,
    industry: role.industry,
    idealCandidate: {
      experienceLevel: role.seniority,
      keySkills: role.keySkills,
      personalityTraits: [],
      education: '',
    },
    keyRequirements: role.hardRequirements,
    cvOptimization: {
      writingStyle: role.writingTone,
      domainStandards: role.archetype,
      focusAreas: role.sectionPriority,
      keywords: role.keywords ?? role.keySkills,
    },
    missingInfo: [],
    candidateProfile: {
      experienceLevel: role.seniority,
      keySkills: role.keySkills,
      personalityTraits: [],
      education: '',
    },
  };
}
