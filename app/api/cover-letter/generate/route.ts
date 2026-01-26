/**
 * Cover Letter Generation API Route
 * Handles cover letter generation requests using Hugging Face
 */

import { NextRequest, NextResponse } from 'next/server';
// import { generateCoverLetter } from '@/src/infrastructure/services/huggingface.service'; // COMMENTED OUT
import type { ApiResponse } from '@/src/shared/types';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

/**
 * POST /api/cover-letter/generate
 * Generate personalized cover letter based on job description and CV data
 * COMMENTED OUT - Temporarily disabled
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<string>>> {
  // Cover letter generation is temporarily disabled
  return NextResponse.json(
    {
      success: false,
      error: 'Cover letter generation is temporarily disabled',
    },
    { status: 503 }
  );

  /* COMMENTED OUT - Cover letter generation
  const requestId = `cl-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();
  
  console.log(`[API] [${requestId}] POST /api/cover-letter/generate - Cover letter generation requested`);
  
  try {
    const body = await request.json();
    const { jobDescription, cvData, personalInfo } = body;

    console.log(`[API] [${requestId}] Request validation...`);
    console.log(`[API] [${requestId}] Job description length: ${jobDescription?.length || 0}`);
    console.log(`[API] [${requestId}] CV data length: ${cvData?.length || 0}`);
    console.log(`[API] [${requestId}] Personal info: ${personalInfo?.fullName ? 'provided' : 'missing'}`);

    // Validate input
    if (!jobDescription || typeof jobDescription !== 'string') {
      console.error(`[API] [${requestId}] ❌ Validation failed: Invalid job description`);
      return NextResponse.json(
        {
          success: false,
          error: 'Job description is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (!cvData || typeof cvData !== 'string') {
      console.error(`[API] [${requestId}] ❌ Validation failed: Invalid CV data`);
      return NextResponse.json(
        {
          success: false,
          error: 'CV data is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (!personalInfo || !personalInfo.fullName || !personalInfo.email) {
      console.error(`[API] [${requestId}] ❌ Validation failed: Invalid personal info`);
      return NextResponse.json(
        {
          success: false,
          error: 'Personal information (fullName and email) is required',
        },
        { status: 400 }
      );
    }

    console.log(`[API] [${requestId}] ✅ Validation passed, starting cover letter generation...`);

    // Generate cover letter
    const coverLetter = await generateCoverLetter(
      jobDescription,
      cvData,
      personalInfo
    );

    const totalTime = Date.now() - startTime;
    console.log(`[API] [${requestId}] ✅ Cover letter generation completed in ${totalTime}ms`);
    console.log(`[API] [${requestId}] Generated cover letter length: ${coverLetter.length} characters`);

    return NextResponse.json({
      success: true,
      data: coverLetter,
      message: 'Cover letter generated successfully',
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[API] [${requestId}] ❌ Cover letter generation error after ${totalTime}ms:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate cover letter. Please try again.',
      },
      { status: 500 }
    );
  }
  */
}
