/**
 * Job Description Analyzer Service
 * Analyzes job descriptions using recruiter-focused framework
 */

import { generateText } from './huggingface.service';
import { HUGGINGFACE_MODELS } from '@/src/shared/constants';
import { promptFramework } from '@/src/infrastructure/frameworks';

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
  // Legacy fields for backward compatibility
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

/**
 * Analyze job description using recruiter-focused framework
 */
export async function analyzeJobDescription(
  jobDescription: string
): Promise<JobAnalysis> {
  try {
    // Use prompt framework for structured analysis
    const { systemMessage, userMessage, estimatedTokens } = promptFramework.build(
      'job-analysis-recruiter',
      { jobDescription }
    );

    console.log(`[JobAnalysis] 📊 Estimated tokens: ${estimatedTokens}`);

    // Combine system and user messages for single API call
    const fullPrompt = `${systemMessage}\n\n${userMessage}`;

    const response = await generateText(
      fullPrompt,
      HUGGINGFACE_MODELS.CV_GENERATION,
      1500 // Optimized response length
    );

    // Try to extract JSON from response
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    }
    if (!jsonMatch) {
      jsonMatch = response.match(/```\s*(\{[\s\S]*?\})\s*```/);
    }

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr) as JobAnalysis;
      
      // Ensure backward compatibility
      if (!parsed.candidateProfile) {
        parsed.candidateProfile = parsed.idealCandidate;
      }
      if (!parsed.values && parsed.hiringIntent?.values) {
        parsed.values = parsed.hiringIntent.values;
      }
      if (!parsed.writingStyle && parsed.cvOptimization?.writingStyle) {
        parsed.writingStyle = parsed.cvOptimization.writingStyle;
      }
      if (!parsed.domainStandards && parsed.cvOptimization?.domainStandards) {
        parsed.domainStandards = parsed.cvOptimization.domainStandards;
      }

      return parsed;
    }

    // Fallback: return structured analysis
    return parseAnalysisFromText(response, jobDescription);
  } catch (error) {
    console.error('Job analysis error:', error);
    // Return basic analysis as fallback
    return getBasicAnalysis(jobDescription);
  }
}

/**
 * Parse analysis from text response
 */
function parseAnalysisFromText(text: string, jobDescription: string): JobAnalysis {
  // Extract key information using regex patterns
  const businessTypeMatch = text.match(/businessType["\s:]+([^",\n]+)/i);
  const industryMatch = text.match(/industry["\s:]+([^",\n]+)/i);
  const skillsMatch = text.match(/keySkills["\s:]+\[([^\]]+)\]/i);
  const valuesMatch = text.match(/values["\s:]+\[([^\]]+)\]/i);

  const idealCandidate = {
    experienceLevel: extractExperienceLevel(text),
    keySkills: skillsMatch
      ? skillsMatch[1].split(',').map((s) => s.trim().replace(/"/g, ''))
      : [],
    personalityTraits: [],
    education: 'Not specified',
  };

  const values = valuesMatch
    ? valuesMatch[1].split(',').map((v) => v.trim().replace(/"/g, ''))
    : [];

  return {
    businessType: businessTypeMatch?.[1]?.trim() || 'Unknown',
    industry: industryMatch?.[1]?.trim() || 'Unknown',
    idealCandidate,
    candidateProfile: idealCandidate, // Backward compatibility
    keyRequirements: extractRequirements(jobDescription),
    cvOptimization: {
      writingStyle: 'Professional',
      domainStandards: 'Standard professional CV format',
      focusAreas: [],
      keywords: [],
    },
    writingStyle: 'Professional', // Backward compatibility
    domainStandards: 'Standard professional CV format', // Backward compatibility
    values, // Backward compatibility
    hiringIntent: {
      urgency: 'medium' as const,
      values,
    },
    missingInfo: [],
  };
}

/**
 * Extract experience level from text
 */
function extractExperienceLevel(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('senior') || lowerText.includes('lead')) return 'Senior';
  if (lowerText.includes('junior') || lowerText.includes('entry')) return 'Junior';
  if (lowerText.includes('mid') || lowerText.includes('intermediate')) return 'Mid';
  if (lowerText.includes('executive') || lowerText.includes('director')) return 'Executive';
  return 'Mid';
}

/**
 * Extract requirements from text
 */
function extractRequirements(text: string): string[] {
  const requirements: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (
      line.match(/^\s*[-•*]\s+/) ||
      line.match(/^\s*\d+\.\s+/) ||
      line.toLowerCase().includes('required') ||
      line.toLowerCase().includes('must have')
    ) {
      const cleaned = line.replace(/^\s*[-•*]\s+/, '').replace(/^\s*\d+\.\s+/, '').trim();
      if (cleaned.length > 10) {
        requirements.push(cleaned);
      }
    }
  }

  return requirements.slice(0, 10); // Limit to 10 requirements
}

/**
 * Get basic analysis as fallback
 */
function getBasicAnalysis(jobDescription: string): JobAnalysis {
  const lowerDesc = jobDescription.toLowerCase();
  const idealCandidate = {
    experienceLevel: extractExperienceLevel(jobDescription),
    keySkills: extractSkillsFromText(jobDescription),
    personalityTraits: [],
    education: 'Not specified',
  };
  
  return {
    businessType: 'Unknown',
    industry: 'Unknown',
    idealCandidate,
    candidateProfile: idealCandidate, // Backward compatibility
    keyRequirements: extractRequirements(jobDescription),
    cvOptimization: {
      writingStyle: 'Professional',
      domainStandards: 'Standard professional CV format',
      focusAreas: [],
      keywords: [],
    },
    writingStyle: 'Professional', // Backward compatibility
    domainStandards: 'Standard professional CV format', // Backward compatibility
    values: [],
    missingInfo: [],
  };
}

/**
 * Extract skills from job description text
 */
function extractSkillsFromText(text: string): string[] {
  const commonSkills = [
    'javascript',
    'python',
    'react',
    'node',
    'sql',
    'aws',
    'docker',
    'kubernetes',
    'agile',
    'scrum',
    'leadership',
    'communication',
    'project management',
    'data analysis',
    'machine learning',
  ];

  const foundSkills: string[] = [];
  const lowerText = text.toLowerCase();

  for (const skill of commonSkills) {
    if (lowerText.includes(skill)) {
      foundSkills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  }

  return foundSkills;
}
