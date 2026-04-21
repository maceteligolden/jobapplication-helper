/**
 * Job Analysis Prompt Framework
 * Recruiter-focused analysis with 20+ years experience perspective
 */

import { PromptTemplate, estimateTokens } from './promptFramework';

/**
 * Recruiter-focused job description analysis
 * Analyzes from the perspective of a senior recruiter understanding:
 * - Speed of execution needs
 * - Ideal employee profile
 * - What the CV presents
 * - Gap analysis from ideal
 */
export const jobAnalysisTemplate: PromptTemplate = {
  name: 'job-analysis-recruiter',
  systemMessage: `You are a senior recruiter with 20+ years of experience evaluating candidates. 
Your expertise includes:
- Understanding what employers truly need beyond the job description
- Identifying execution speed vs. depth requirements
- Recognizing ideal candidate profiles for different roles
- Assessing CV quality and candidate potential
- Identifying gaps between candidate and ideal profile

Analyze job descriptions with deep insight into hiring intent, team dynamics, and role expectations.`,

  buildUserMessage: (data: { jobDescription: string }) => {
    const { jobDescription } = data;
    
    return `Analyze this job description from a senior recruiter's perspective:

JOB DESCRIPTION:
${jobDescription}

Provide analysis in this JSON format:
{
  "businessType": "Company type (e.g., 'Tech Startup', 'Enterprise', 'Agency')",
  "industry": "Industry sector",
  "executionProfile": {
    "speedPriority": "high|medium|low - How critical is fast execution?",
    "depthPriority": "high|medium|low - How critical is deep expertise?",
    "autonomyLevel": "high|medium|low - How much independence is expected?",
    "collaborationLevel": "high|medium|low - How much teamwork is required?"
  },
  "idealCandidate": {
    "experienceLevel": "Junior|Mid|Senior|Executive",
    "yearsExperience": "X-Y years",
    "keySkills": ["skill1", "skill2", "skill3"],
    "personalityTraits": ["trait1", "trait2"],
    "workStyle": "Fast-paced|Methodical|Balanced",
    "education": "Required education level"
  },
  "hiringIntent": {
    "urgency": "high|medium|low",
    "growthRole": true,
    "replacementRole": true,
    "teamExpansion": true,
    "values": ["value1", "value2"]
  },
  "keyRequirements": ["requirement1", "requirement2"],
  "cvOptimization": {
    "writingStyle": "Professional|Technical|Creative|Casual",
    "domainStandards": "Domain-specific CV format guidance",
    "focusAreas": ["area1", "area2"],
    "keywords": ["keyword1", "keyword2"]
  },
  "missingInfo": ["Information typically missing from CVs for this role"]
}

Focus on understanding:
1. What does this role REALLY need? (Speed vs. depth)
2. Who is the IDEAL candidate? (Profile, skills, traits)
3. What should a CV SHOW for this role? (Presentation, focus)
4. What GAPS typically exist? (Common missing elements)`;
  },

  estimatedInputTokens: (data: { jobDescription: string }) => {
    const systemTokens = estimateTokens(jobAnalysisTemplate.systemMessage);
    const userTokens = estimateTokens(jobAnalysisTemplate.buildUserMessage(data));
    // Add 20% buffer for JSON structure
    return Math.ceil((systemTokens + userTokens) * 1.2);
  },

  maxResponseTokens: 1500, // Optimized for structured JSON response
};
