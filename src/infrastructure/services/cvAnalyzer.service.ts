/**
 * CV Analysis Service
 * Analyzes CV content and calculates match score with job description
 */

import { generateText } from './huggingface.service';
import { HUGGINGFACE_MODELS } from '@/src/shared/constants';
import type { JobAnalysis } from './jobAnalyzer.service';

export interface CVMatchAnalysis {
  matchScore: number; // 0-100
  matchedSkills: string[];
  missingSkills: string[];
  matchedRequirements: string[];
  missingRequirements: string[];
  semanticGaps: string[];
  recommendations: string[];
}

/**
 * Analyze CV match with job description
 */
export async function analyzeCVMatch(
  cvContent: string,
  jobDescription: string,
  jobAnalysis: JobAnalysis
): Promise<CVMatchAnalysis> {
  const analysisPrompt = `You are a CV matching expert. Analyze how well the CV matches the job description.

Job Description:
${jobDescription}

Job Requirements:
${jobAnalysis.keyRequirements.join('\n')}

Required Skills:
${jobAnalysis.candidateProfile.keySkills.join(', ')}

CV Content:
${cvContent}

Provide a detailed matching analysis in JSON format:
{
  "matchScore": 0-100,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "matchedRequirements": ["req1", "req2"],
  "missingRequirements": ["req1", "req2"],
  "semanticGaps": ["gap1", "gap2"],
  "recommendations": ["rec1", "rec2"]
}

Be thorough and specific. Consider both exact matches and semantic similarity.`;

  try {
    const response = await generateText(
      analysisPrompt,
      HUGGINGFACE_MODELS.CV_GENERATION,
      2000
    );

    console.log('AI Analysis Response:', response.substring(0, 500)); // Debug log

    // Try to extract JSON - be more flexible with JSON extraction
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    
    // If no JSON found, try to find JSON array or other formats
    if (!jsonMatch) {
      jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    }
    if (!jsonMatch) {
      jsonMatch = response.match(/```\s*(\{[\s\S]*?\})\s*```/);
    }
    
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr) as CVMatchAnalysis;
        
        // Validate parsed data
        if (typeof parsed.matchScore === 'number' && parsed.matchScore >= 0 && parsed.matchScore <= 100) {
          // Ensure arrays exist
          parsed.matchedSkills = parsed.matchedSkills || [];
          parsed.missingSkills = parsed.missingSkills || [];
          parsed.matchedRequirements = parsed.matchedRequirements || [];
          parsed.missingRequirements = parsed.missingRequirements || [];
          parsed.semanticGaps = parsed.semanticGaps || [];
          parsed.recommendations = parsed.recommendations || [];
          
          console.log('AI Analysis Success:', { matchScore: parsed.matchScore });
          return parsed;
        } else {
          console.warn('AI returned invalid matchScore, using fallback');
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }
    } else {
      console.warn('No JSON found in AI response, using fallback');
    }

    // Fallback: calculate basic match
    console.log('Using fallback calculation');
    return calculateBasicMatch(cvContent, jobDescription, jobAnalysis);
  } catch (error) {
    console.error('CV match analysis error:', error);
    console.log('Using fallback calculation due to error');
    return calculateBasicMatch(cvContent, jobDescription, jobAnalysis);
  }
}

/**
 * Calculate basic match score using keyword matching
 */
function calculateBasicMatch(
  cvContent: string,
  jobDescription: string,
  jobAnalysis: JobAnalysis
): CVMatchAnalysis {
  const cvLower = cvContent.toLowerCase();
  const jobLower = jobDescription.toLowerCase();

  // Count matched skills
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of jobAnalysis.candidateProfile.keySkills) {
    const skillLower = skill.toLowerCase();
    if (cvLower.includes(skillLower)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  // Count matched requirements
  const matchedRequirements: string[] = [];
  const missingRequirements: string[] = [];

  for (const req of jobAnalysis.keyRequirements) {
    const reqLower = req.toLowerCase();
    // Check if CV mentions any key terms from requirement
    const reqWords = reqLower.split(/\s+/).filter((w) => w.length > 4);
    const hasMatch = reqWords.some((word) => cvLower.includes(word));
    
    if (hasMatch) {
      matchedRequirements.push(req);
    } else {
      missingRequirements.push(req);
    }
  }

  // Calculate score with better weighting
  // Ensure we have valid data
  const totalSkills = Math.max(1, jobAnalysis.candidateProfile.keySkills.length);
  const totalRequirements = Math.max(1, jobAnalysis.keyRequirements.length);
  
  // Skill matching (40% weight)
  const skillScore = (matchedSkills.length / totalSkills) * 40;
  
  // Requirement matching (40% weight)
  const requirementScore = (matchedRequirements.length / totalRequirements) * 40;
  
  // Keyword overlap (20% weight)
  const keywordOverlap = calculateKeywordOverlap(cvContent, jobDescription);
  const keywordScore = keywordOverlap * 20;
  
  // Calculate total score
  let matchScore = Math.round(skillScore + requirementScore + keywordScore);
  
  // Add bonus for having substantial content
  if (cvContent.length > 500) {
    matchScore = Math.min(100, matchScore + 5); // Small bonus for detailed CV
  }
  
  // Ensure score is between 0-100
  matchScore = Math.max(0, Math.min(100, matchScore));
  
  console.log('Fallback Calculation:', {
    matchedSkills: matchedSkills.length,
    totalSkills,
    matchedRequirements: matchedRequirements.length,
    totalRequirements,
    keywordOverlap,
    skillScore,
    requirementScore,
    keywordScore,
    matchScore,
  });

  return {
    matchScore,
    matchedSkills,
    missingSkills,
    matchedRequirements,
    missingRequirements,
    semanticGaps: missingRequirements.slice(0, 5),
    recommendations: generateRecommendations(missingSkills, missingRequirements),
  };
}

/**
 * Calculate keyword overlap between CV and job description
 */
function calculateKeywordOverlap(cvContent: string, jobDescription: string): number {
  const cvWords = new Set(
    cvContent
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .map((w) => w.replace(/[^\w]/g, ''))
  );

  const jobWords = new Set(
    jobDescription
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .map((w) => w.replace(/[^\w]/g, ''))
  );

  let matches = 0;
  for (const word of jobWords) {
    if (cvWords.has(word)) {
      matches++;
    }
  }

  return jobWords.size > 0 ? matches / jobWords.size : 0;
}

/**
 * Generate recommendations based on gaps
 */
function generateRecommendations(
  missingSkills: string[],
  missingRequirements: string[]
): string[] {
  const recommendations: string[] = [];

  if (missingSkills.length > 0) {
    recommendations.push(
      `Highlight experience with: ${missingSkills.slice(0, 3).join(', ')}`
    );
  }

  if (missingRequirements.length > 0) {
    recommendations.push(
      `Address requirement: ${missingRequirements[0]}`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('CV looks well-matched! Consider adding more specific achievements.');
  }

  return recommendations;
}
