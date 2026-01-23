/**
 * Job Description Analyzer Service
 * Analyzes job descriptions to extract business type, candidate profile, values, and requirements
 */

import { generateText } from './huggingface.service';
import { HUGGINGFACE_MODELS } from '@/src/shared/constants';

export interface JobAnalysis {
  businessType: string;
  industry: string;
  candidateProfile: {
    experienceLevel: string;
    keySkills: string[];
    personalityTraits: string[];
    education: string;
  };
  values: string[];
  keyRequirements: string[];
  writingStyle: string;
  domainStandards: string;
  missingInfo: string[];
}

/**
 * Analyze job description comprehensively
 */
export async function analyzeJobDescription(
  jobDescription: string
): Promise<JobAnalysis> {
  const analysisPrompt = `You are a professional job description analyzer. Analyze the following job description comprehensively.

Job Description:
${jobDescription}

Provide a detailed analysis in the following JSON format:
{
  "businessType": "Type of business/company (e.g., 'Tech Startup', 'Financial Services', 'Healthcare')",
  "industry": "Industry sector",
  "candidateProfile": {
    "experienceLevel": "Junior/Mid/Senior/Executive",
    "keySkills": ["skill1", "skill2", "skill3"],
    "personalityTraits": ["trait1", "trait2"],
    "education": "Required education level"
  },
  "values": ["value1", "value2", "value3"],
  "keyRequirements": ["requirement1", "requirement2"],
  "writingStyle": "Professional/Casual/Technical/Creative",
  "domainStandards": "Domain-specific CV writing standards (e.g., 'Software: Focus on impact and metrics', 'Marketing: Focus on campaigns and ROI')",
  "missingInfo": ["What information might be missing from a typical CV"]
}

Be specific and detailed. Focus on what the employer values and what they're looking for in a candidate.`;

  try {
    const response = await generateText(
      analysisPrompt,
      HUGGINGFACE_MODELS.CV_GENERATION,
      2000
    );

    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as JobAnalysis;
    }

    // Fallback: return structured analysis
    return parseAnalysisFromText(response);
  } catch (error) {
    console.error('Job analysis error:', error);
    // Return basic analysis as fallback
    return getBasicAnalysis(jobDescription);
  }
}

/**
 * Parse analysis from text response
 */
function parseAnalysisFromText(text: string): JobAnalysis {
  // Extract key information using regex patterns
  const businessTypeMatch = text.match(/businessType["\s:]+([^",\n]+)/i);
  const industryMatch = text.match(/industry["\s:]+([^",\n]+)/i);
  const skillsMatch = text.match(/keySkills["\s:]+\[([^\]]+)\]/i);
  const valuesMatch = text.match(/values["\s:]+\[([^\]]+)\]/i);

  return {
    businessType: businessTypeMatch?.[1]?.trim() || 'Unknown',
    industry: industryMatch?.[1]?.trim() || 'Unknown',
    candidateProfile: {
      experienceLevel: extractExperienceLevel(text),
      keySkills: skillsMatch
        ? skillsMatch[1].split(',').map((s) => s.trim().replace(/"/g, ''))
        : [],
      personalityTraits: [],
      education: 'Not specified',
    },
    values: valuesMatch
      ? valuesMatch[1].split(',').map((v) => v.trim().replace(/"/g, ''))
      : [],
    keyRequirements: extractRequirements(text),
    writingStyle: 'Professional',
    domainStandards: 'Standard professional CV format',
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
  
  return {
    businessType: 'Unknown',
    industry: 'Unknown',
    candidateProfile: {
      experienceLevel: extractExperienceLevel(jobDescription),
      keySkills: extractSkillsFromText(jobDescription),
      personalityTraits: [],
      education: 'Not specified',
    },
    values: [],
    keyRequirements: extractRequirements(jobDescription),
    writingStyle: 'Professional',
    domainStandards: 'Standard professional CV format',
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
