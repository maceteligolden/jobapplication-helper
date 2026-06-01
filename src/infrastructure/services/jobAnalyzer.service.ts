/**
 * Job Description Analyzer — OpenAI via LangChain
 */

import { analyzeRole } from '@/src/ai/agents/jobAnalyzer.agent';
import { roleProfileToJobAnalysis } from './jobAnalysis.mapper';
import type { RoleIntelligenceProfile } from '@/src/ai/schemas/roleProfile.schema';

export interface JobAnalysis {
  businessType: string;
  industry: string;
  executionProfile?: {
    speedPriority: 'high' | 'medium' | 'low';
    depthPriority: 'high' | 'medium' | 'low';
    autonomyLevel: 'high' | 'medium' | 'low';
    collaborationLevel: 'high' | 'medium' | 'low';
  };
  idealCandidate: {
    experienceLevel: string;
    yearsExperience?: string;
    keySkills: string[];
    personalityTraits: string[];
    workStyle?: string;
    education: string;
  };
  hiringIntent?: {
    urgency: 'high' | 'medium' | 'low';
    growthRole?: boolean;
    replacementRole?: boolean;
    teamExpansion?: boolean;
    values: string[];
  };
  keyRequirements: string[];
  cvOptimization: {
    writingStyle: string;
    domainStandards: string;
    focusAreas: string[];
    keywords: string[];
  };
  missingInfo: string[];
  candidateProfile?: {
    experienceLevel: string;
    keySkills: string[];
    personalityTraits: string[];
    education: string;
  };
  values?: string[];
  writingStyle?: string;
  domainStandards?: string;
}

export type { RoleIntelligenceProfile };

export async function analyzeJobDescription(
  jobDescription: string
): Promise<JobAnalysis> {
  const roleProfile = await analyzeRole(jobDescription);
  return roleProfileToJobAnalysis(roleProfile);
}

export async function analyzeJobDescriptionFull(
  jobDescription: string
): Promise<RoleIntelligenceProfile> {
  return analyzeRole(jobDescription);
}
