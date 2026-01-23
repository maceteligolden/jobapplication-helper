/**
 * Q&A Question Generation API Route
 * Generates questions based on job analysis and CV gaps
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/src/infrastructure/services/huggingface.service';
import { HUGGINGFACE_MODELS } from '@/src/shared/constants';
import type { ApiResponse } from '@/src/shared/types';
import type { QuestionType } from '@/src/shared/types';
import type { JobAnalysis } from '@/src/infrastructure/services/jobAnalyzer.service';
import type { CVMatchAnalysis } from '@/src/infrastructure/services/cvAnalyzer.service';
import { extractCVInfo, type ExtractedCVInfo } from '@/src/infrastructure/services/cvInfoExtractor.service';

export interface GeneratedQuestion {
  id: string;
  type: QuestionType;
  question: string;
  purpose: string;
  priority: 'high' | 'medium' | 'low';
}

export interface GenerateQuestionsResponse {
  questions: GeneratedQuestion[];
  totalQuestions: number;
}

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/qa/generate-questions
 * Generate questions based on job analysis and CV gaps
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GenerateQuestionsResponse>>> {
  try {
    const body = await request.json();
    const { jobAnalysis, cvMatch, cvContent } = body;

    if (!jobAnalysis) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job analysis is required',
        },
        { status: 400 }
      );
    }

    // Extract information from CV if provided
    let extractedCVInfo: ExtractedCVInfo | undefined;
    if (cvContent && typeof cvContent === 'string' && cvContent.trim().length > 0) {
      try {
        extractedCVInfo = await extractCVInfo(cvContent);
      } catch (error) {
        console.error('Failed to extract CV info:', error);
        // Continue without extracted info
      }
    }

    // Generate questions using AI, skipping information already in CV
    const questions = await generateQuestionsFromAnalysis(
      jobAnalysis as JobAnalysis,
      cvMatch as CVMatchAnalysis | undefined,
      extractedCVInfo
    );

    return NextResponse.json({
      success: true,
      data: {
        questions,
        totalQuestions: questions.length,
      },
      message: 'Questions generated successfully',
    });
  } catch (error) {
    console.error('Question generation error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate questions. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate questions from job analysis
 * Skips questions for information already present in the CV
 */
async function generateQuestionsFromAnalysis(
  jobAnalysis: JobAnalysis,
  cvMatch?: CVMatchAnalysis,
  extractedCVInfo?: ExtractedCVInfo
): Promise<GeneratedQuestion[]> {
  // Build context about what's already in the CV
  const cvContext = extractedCVInfo ? `
CV Information Already Available:
- Personal Info: ${extractedCVInfo.hasPersonalInfo ? `Name: ${extractedCVInfo.personalInfo.fullName || 'present'}, Email: ${extractedCVInfo.personalInfo.email || 'present'}` : 'NOT PRESENT - ask for this'}
- Experience: ${extractedCVInfo.hasExperience ? `${extractedCVInfo.experience.length} position(s) found` : 'NOT PRESENT - ask for this'}
- Education: ${extractedCVInfo.hasEducation ? `${extractedCVInfo.education.length} entry/entries found` : 'NOT PRESENT - ask for this'}
- Skills: ${extractedCVInfo.hasSkills ? `${extractedCVInfo.skills.length} skills found: ${extractedCVInfo.skills.slice(0, 5).join(', ')}` : 'NOT PRESENT - ask for this'}

IMPORTANT: DO NOT ask questions for information that is already present in the CV.
For example:
- If personal info (name, email) is present, skip personal_info questions
- If experience is present, focus on missing details or achievements, not basic experience
- If skills are present, focus on missing skills or deeper expertise, not basic skill questions
- If education is present, skip basic education questions unless specific details are missing
` : `
No CV uploaded - ask for all information including personal details, experience, education, and skills.
`;

  const prompt = `You are a professional recruiter. Generate 10-15 specific questions to gather information for creating an optimized CV.

Job Analysis:
- Business Type: ${jobAnalysis.businessType}
- Industry: ${jobAnalysis.industry}
- Required Skills: ${jobAnalysis.candidateProfile.keySkills.join(', ')}
- Key Requirements: ${jobAnalysis.keyRequirements.join('; ')}
- Values: ${jobAnalysis.values.join(', ')}
- Writing Style: ${jobAnalysis.writingStyle}
- Domain Standards: ${jobAnalysis.domainStandards}

${cvMatch ? `CV Match Score: ${cvMatch.matchScore}%
Missing Skills: ${cvMatch.missingSkills.join(', ')}
Missing Requirements: ${cvMatch.missingRequirements.join('; ')}` : ''}

${cvContext}

Generate 10-15 questions that will help gather MISSING information:
${extractedCVInfo?.hasPersonalInfo ? '- SKIP personal information (name, email, location) - already in CV' : '- Personal information (name, email, location) - NOT in CV'}
${extractedCVInfo?.hasExperience ? '- Focus on experience DETAILS, achievements, metrics - basic experience is in CV' : '- Experience details - NOT in CV'}
${extractedCVInfo?.hasEducation ? '- SKIP basic education - already in CV' : '- Education - NOT in CV'}
${extractedCVInfo?.hasSkills ? '- Focus on missing skills or deeper expertise - basic skills are in CV' : '- Skills - NOT in CV'}
- Achievements and impact metrics (always ask if not detailed)
- Domain-specific experience
- Values alignment
- Certifications (if relevant)

Format as JSON array:
[
  {
    "type": "experience|skills|education|personal_info|certifications|summary",
    "question": "The question text",
    "purpose": "Why this question is important",
    "priority": "high|medium|low"
  }
]

Make questions specific to the job requirements. Focus on getting concrete examples, metrics, and achievements. DO NOT duplicate information already in the CV.`;

  try {
    const response = await generateText(
      prompt,
      HUGGINGFACE_MODELS.CV_GENERATION,
      3000
    );

    // Extract JSON array
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Omit<GeneratedQuestion, 'id'>[];
      return parsed.map((q, index) => ({
        ...q,
        id: `q-${Date.now()}-${index}`,
      }));
    }

    // Fallback: generate default questions
    return generateDefaultQuestions(jobAnalysis, cvMatch, extractedCVInfo);
  } catch (error) {
    console.error('Question generation error:', error);
    return generateDefaultQuestions(jobAnalysis, cvMatch, extractedCVInfo);
  }
}

/**
 * Generate default questions as fallback
 * Skips questions for information already in CV
 */
function generateDefaultQuestions(
  jobAnalysis: JobAnalysis,
  cvMatch?: CVMatchAnalysis,
  extractedCVInfo?: ExtractedCVInfo
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];

  // Only ask for personal info if not in CV
  if (!extractedCVInfo?.hasPersonalInfo) {
    questions.push({
      id: 'q-1',
      type: 'personal_info',
      question: "Let's start with the basics. What's your full name, email, and location?",
      purpose: 'Get contact information',
      priority: 'high',
    });
  }
  // Experience questions - adjust based on what's in CV
  if (!extractedCVInfo?.hasExperience) {
    questions.push({
      id: `q-${questions.length + 1}`,
      type: 'experience',
      question: `Tell me about your most relevant work experience for a ${jobAnalysis.candidateProfile.experienceLevel} role in ${jobAnalysis.industry}. What was your position and what did you accomplish?`,
      purpose: 'Understand work experience',
      priority: 'high',
    });
  } else {
    // CV has experience, ask for details/achievements
    questions.push({
      id: `q-${questions.length + 1}`,
      type: 'experience',
      question: `I see you have work experience. Can you tell me about your biggest achievements and impact metrics? Include specific numbers if possible.`,
      purpose: 'Get detailed achievements and metrics',
      priority: 'high',
    });
  }

  // Skills questions - adjust based on what's in CV
  if (!extractedCVInfo?.hasSkills) {
    questions.push({
      id: `q-${questions.length + 1}`,
      type: 'skills',
      question: `Which of these skills do you have experience with: ${jobAnalysis.candidateProfile.keySkills.slice(0, 5).join(', ')}? Can you give examples?`,
      purpose: 'Verify key skills',
      priority: 'high',
    });
  } else if (cvMatch && cvMatch.missingSkills.length > 0) {
    // CV has skills but missing some required ones
    questions.push({
      id: `q-${questions.length + 1}`,
      type: 'skills',
      question: `I see you have some skills listed. Can you tell me about your experience with ${cvMatch.missingSkills.slice(0, 3).join(', ')}?`,
      purpose: 'Fill skill gaps',
      priority: 'high',
    });
  }

  // Education questions - only if not in CV
  if (!extractedCVInfo?.hasEducation) {
    questions.push({
      id: `q-${questions.length + 1}`,
      type: 'education' as QuestionType,
      question: `What's your educational background? ${jobAnalysis.candidateProfile.education !== 'Not specified' ? `The role requires: ${jobAnalysis.candidateProfile.education}` : ''}`,
      purpose: 'Verify education',
      priority: 'medium',
    });
  }

  // Add more questions to reach 10+
  const additionalQuestions: GeneratedQuestion[] = [
    {
      id: `q-${questions.length + 1}`,
      type: 'experience' as QuestionType,
      question: 'What are your biggest professional achievements? Include specific metrics if possible.',
      purpose: 'Get achievement data',
      priority: 'high',
    },
    {
      id: 'q-7',
      type: 'summary' as QuestionType,
      question: 'Give me a brief professional summary that highlights why you\'re a great fit for this role.',
      purpose: 'Create professional summary',
      priority: 'high',
    },
  ];

  questions.push(...additionalQuestions);

  // Ensure we have at least 10 questions
  while (questions.length < 10) {
    questions.push({
      id: `q-${questions.length + 1}`,
      type: 'experience' as QuestionType,
      question: `Tell me about another relevant experience or project that demonstrates your fit for this ${jobAnalysis.businessType} role.`,
      purpose: 'Gather more experience details',
      priority: 'medium',
    });
  }

  return questions.slice(0, 15); // Max 15 questions
}
