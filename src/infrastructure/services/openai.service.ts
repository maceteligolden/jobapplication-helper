/**
 * Thin OpenAI service — wraps LangChain for legacy route compatibility
 */

import { getChatMini } from '@/src/infrastructure/llm/openai.client';
import { classifyJobType } from '@/src/ai/agents/jobTypeClassifier.agent';
import { analyzeRole } from '@/src/ai/agents/jobAnalyzer.agent';
import { profileCandidate } from '@/src/ai/agents/candidateProfiler.agent';
import { scoreMatch } from '@/src/ai/agents/scoringEngine.agent';
import { generateResumeArtifacts, generateCoverLetter } from '@/src/ai/agents/resumeGenerator.agent';
import { roleProfileToJobAnalysis } from './jobAnalysis.mapper';
import type { MatchReport } from '@/src/ai/schemas/matchReport.schema';
import type { JobAnalysis } from './jobAnalyzer.service';

export { analyzeRole, profileCandidate, scoreMatch, generateResumeArtifacts, roleProfileToJobAnalysis };

export async function generateText(prompt: string): Promise<string> {
  const response = await getChatMini().invoke([{ role: 'user', content: prompt }]);
  return typeof response.content === 'string' ? response.content : String(response.content);
}

export function matchReportToLegacy(match: MatchReport) {
  return {
    matchScore: match.overallFit,
    matchedSkills: match.strengths.map((s) => s.text).slice(0, 10),
    missingSkills: match.gaps.map((g) => g.requirement),
    matchedRequirements: match.strengths.filter((s) => s.source === 'jd').map((s) => s.text),
    missingRequirements: match.gaps.map((g) => g.requirement),
    semanticGaps: match.gaps.filter((g) => g.severity === 'critical').map((g) => g.requirement),
    recommendations: match.improvementActions.map((a) => a.action),
    routingRecommendation: match.routingRecommendation,
    dimensions: match.dimensions,
  };
}

export async function generateCV(
  jobDescription: string,
  cvContent: string,
  _jobAnalysis?: JobAnalysis | null
): Promise<string> {
  const jobTypeProfile = await classifyJobType(jobDescription);
  const role = await analyzeRole(jobDescription, jobTypeProfile);
  const cvText = cvContent?.trim() || '';
  if (!cvText) {
    throw new Error('CV content is required for generation');
  }
  const candidate = await profileCandidate(cvText);
  const artifacts = await generateResumeArtifacts(
    role,
    candidate,
    jobDescription,
    cvText,
    jobTypeProfile
  );
  return artifacts.atsCv;
}

export async function generateCoverLetterText(
  jobDescription: string,
  cvContent: string
): Promise<string> {
  const jobTypeProfile = await classifyJobType(jobDescription);
  const role = await analyzeRole(jobDescription, jobTypeProfile);
  const candidate = await profileCandidate(cvContent);
  const artifacts = await generateResumeArtifacts(
    role,
    candidate,
    jobDescription,
    cvContent,
    jobTypeProfile
  );
  return generateCoverLetter(role, candidate, jobDescription, artifacts.atsCv);
}
