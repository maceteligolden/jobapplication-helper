/**
 * CV Analysis Service — multi-dimensional OpenAI scoring
 */

import { analyzeJobDescription } from './jobAnalyzer.service';
import { analyzeRole, scoreMatch, matchReportToLegacy } from './openai.service';
import type { MatchReport } from '@/src/ai/schemas/matchReport.schema';
import type { JobAnalysis } from './jobAnalyzer.service';
import type { RoleIntelligenceProfile } from '@/src/ai/schemas/roleProfile.schema';
import { profileCandidate } from '@/src/ai/agents/candidateProfiler.agent';

export interface CVMatchAnalysis {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchedRequirements: string[];
  missingRequirements: string[];
  semanticGaps: string[];
  recommendations: string[];
  routingRecommendation?: string;
  dimensions?: MatchReport['dimensions'];
}

export type { MatchReport };

export async function analyzeCVMatch(
  cvContent: string,
  jobDescription: string,
  jobAnalysis: JobAnalysis
): Promise<CVMatchAnalysis> {
  const roleProfile: RoleIntelligenceProfile = {
    archetype: 'corporate',
    seniority: mapSeniority(jobAnalysis.idealCandidate?.experienceLevel),
    industry: jobAnalysis.industry,
    hardRequirements: jobAnalysis.keyRequirements,
    softRequirements: jobAnalysis.idealCandidate?.personalityTraits ?? [],
    hiddenExpectations: [],
    successMetrics: [],
    hiringPriorities: jobAnalysis.hiringIntent?.values ?? [],
    keySkills: jobAnalysis.idealCandidate?.keySkills ?? [],
    writingTone: jobAnalysis.cvOptimization?.writingStyle ?? 'professional',
    sectionPriority: jobAnalysis.cvOptimization?.focusAreas ?? ['experience', 'skills'],
    keywords: jobAnalysis.cvOptimization?.keywords ?? [],
    title: '',
    company: '',
    region: '',
  };

  try {
    const fullRole = await analyzeRole(jobDescription);
    const candidate = await profileCandidate(cvContent || 'Empty CV');
    const report = await scoreMatch(fullRole, candidate, jobDescription, cvContent);
    return matchReportToLegacy(report) as CVMatchAnalysis;
  } catch {
    const candidate = await profileCandidate(cvContent || 'Empty CV');
    const report = await scoreMatch(roleProfile, candidate, jobDescription, cvContent);
    return matchReportToLegacy(report) as CVMatchAnalysis;
  }
}

function mapSeniority(level?: string): RoleIntelligenceProfile['seniority'] {
  const l = (level ?? '').toLowerCase();
  if (l.includes('executive') || l.includes('director')) return 'executive';
  if (l.includes('principal') || l.includes('staff')) return 'principal';
  if (l.includes('lead')) return 'lead';
  if (l.includes('senior')) return 'senior';
  if (l.includes('junior') || l.includes('entry')) return 'junior';
  if (l.includes('intern')) return 'intern';
  return 'mid';
}

/** @deprecated keyword-only fallback removed — use semantic scoring */
export function calculateBasicMatch(): never {
  throw new Error('calculateBasicMatch is deprecated; use analyzeCVMatch');
}
