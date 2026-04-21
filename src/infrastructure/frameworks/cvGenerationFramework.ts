/**
 * CV Generation Prompt Framework
 * Optimized for performance with direct understanding focus
 */

import { PromptTemplate, estimateTokens } from './promptFramework';

export interface CVGenerationData {
  jobDescription: string;
  cvData: string;
  jobAnalysis?: {
    businessType: string;
    industry: string;
    executionProfile?: {
      speedPriority: string;
      depthPriority: string;
      autonomyLevel: string;
      collaborationLevel: string;
    };
    idealCandidate?: {
      experienceLevel: string;
      keySkills: string[];
      workStyle: string;
    };
    hiringIntent?: {
      urgency: string;
      values: string[];
    };
    cvOptimization?: {
      writingStyle: string;
      domainStandards: string;
      focusAreas: string[];
      keywords: string[];
    };
  };
}

/**
 * Optimized CV generation prompt
 * Focuses on direct understanding and performance
 */
export const cvGenerationTemplate: PromptTemplate = {
  name: 'cv-generation-optimized',
  systemMessage: `You are an expert CV optimizer. Create CVs that:
- Match job requirements precisely
- Highlight relevant experience and skills
- Use appropriate formatting and style
- Focus on impact and achievements
- Optimize for ATS (Applicant Tracking Systems) compatibility`,

  buildUserMessage: (data: CVGenerationData) => {
    const { jobDescription, cvData, jobAnalysis } = data;

    // Build concise context from job analysis
    const context = jobAnalysis ? [
      `ROLE: ${jobAnalysis.idealCandidate?.experienceLevel || 'Professional'} ${jobAnalysis.industry || 'role'}`,
      `KEY SKILLS: ${jobAnalysis.idealCandidate?.keySkills?.join(', ') || 'N/A'}`,
      `STYLE: ${jobAnalysis.cvOptimization?.writingStyle || 'Professional'}`,
      `FOCUS: ${jobAnalysis.cvOptimization?.focusAreas?.join(', ') || 'Standard CV format'}`,
      `KEYWORDS: ${jobAnalysis.cvOptimization?.keywords?.join(', ') || 'N/A'}`,
      `EXECUTION: ${jobAnalysis.executionProfile?.speedPriority === 'high' ? 'Emphasize speed and results' : 'Emphasize depth and expertise'}`,
    ].join('\n') : '';

    return `Generate an optimized CV for this role:

JOB DESCRIPTION:
${jobDescription}

${context ? `CONTEXT:\n${context}\n` : ''}

CANDIDATE INFORMATION:
${cvData}

INSTRUCTIONS:
1. Match job requirements - highlight relevant experience and skills
2. Use ${jobAnalysis?.cvOptimization?.writingStyle || 'professional'} style
3. Follow ${jobAnalysis?.cvOptimization?.domainStandards || 'standard professional CV format'}
4. Include keywords: ${jobAnalysis?.cvOptimization?.keywords?.join(', ') || 'from job description'}
5. Focus on achievements and impact
6. Structure: Personal Info → Summary → Experience → Skills → Education
7. Keep concise but comprehensive
8. Optimize for ATS compatibility

Generate the optimized CV:`;
  },

  estimatedInputTokens: (data: CVGenerationData) => {
    const systemTokens = estimateTokens(cvGenerationTemplate.systemMessage);
    const userTokens = estimateTokens(cvGenerationTemplate.buildUserMessage(data));
    // Add 10% buffer
    return Math.ceil((systemTokens + userTokens) * 1.1);
  },

  maxResponseTokens: 3000, // CV length limit for performance
};
