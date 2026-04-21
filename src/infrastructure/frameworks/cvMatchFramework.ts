/**
 * CV Match Analysis Framework
 * Analyzes how well CV matches job requirements from recruiter perspective
 */

import { PromptTemplate, estimateTokens } from './promptFramework';

export interface CVMatchData {
  cvContent: string;
  jobDescription: string;
  jobAnalysis: {
    idealCandidate?: {
      keySkills: string[];
      experienceLevel: string;
    };
    keyRequirements: string[];
    executionProfile?: {
      speedPriority: string;
      depthPriority: string;
    };
  };
}

/**
 * CV Match analysis prompt
 * Evaluates CV against ideal candidate profile
 */
export const cvMatchTemplate: PromptTemplate = {
  name: 'cv-match-analysis',
  systemMessage: `You are a senior recruiter evaluating a candidate's CV against job requirements.
Assess:
- Skill matches and gaps
- Experience alignment
- How well CV presents candidate vs. ideal profile
- Distance from ideal candidate profile
- Specific recommendations for improvement`,

  buildUserMessage: (data: CVMatchData) => {
    const { cvContent, jobDescription, jobAnalysis } = data;

    return `Evaluate how well this CV matches the job requirements:

JOB DESCRIPTION:
${jobDescription}

IDEAL CANDIDATE PROFILE:
- Skills: ${jobAnalysis.idealCandidate?.keySkills?.join(', ') || 'N/A'}
- Level: ${jobAnalysis.idealCandidate?.experienceLevel || 'N/A'}
- Key Requirements: ${jobAnalysis.keyRequirements.join('; ')}
- Execution: ${jobAnalysis.executionProfile?.speedPriority === 'high' ? 'Fast execution needed' : 'Deep expertise needed'}

CANDIDATE CV:
${cvContent}

Provide analysis in JSON format:
{
  "matchScore": 0-100,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "matchedRequirements": ["req1", "req2"],
  "missingRequirements": ["req1", "req2"],
  "cvPresentation": {
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "clarity": "high|medium|low",
    "completeness": "high|medium|low"
  },
  "gapAnalysis": {
    "distanceFromIdeal": "close|moderate|far",
    "primaryGaps": ["gap1", "gap2"],
    "quickWins": ["improvement1", "improvement2"]
  },
  "recommendations": ["rec1", "rec2"]
}

Focus on:
1. What does the CV PRESENT? (Strengths, clarity, completeness)
2. How FAR is it from ideal? (Gap analysis, distance)
3. What's MISSING? (Skills, requirements, presentation)`;
  },

  estimatedInputTokens: (data: CVMatchData) => {
    const systemTokens = estimateTokens(cvMatchTemplate.systemMessage);
    const userTokens = estimateTokens(cvMatchTemplate.buildUserMessage(data));
    return Math.ceil((systemTokens + userTokens) * 1.2);
  },

  maxResponseTokens: 1500,
};
