/**
 * Cover Letter Generation API Route
 * Handles cover letter generation requests using Hugging Face
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCoverLetter } from '@/src/infrastructure/services/huggingface.service';
import type { ApiResponse } from '@/src/shared/types';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

/**
 * POST /api/cover-letter/generate
 * Generate personalized cover letter based on job description and CV data
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<string>>> {
  try {
    const body = await request.json();
    const { jobDescription, cvData, personalInfo } = body;

    // Validate input
    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Job description is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (!cvData || typeof cvData !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'CV data is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (!personalInfo || !personalInfo.fullName || !personalInfo.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Personal information (fullName and email) is required',
        },
        { status: 400 }
      );
    }

    // Generate cover letter
    const coverLetter = await generateCoverLetter(
      jobDescription,
      cvData,
      personalInfo
    );

    return NextResponse.json({
      success: true,
      data: coverLetter,
      message: 'Cover letter generated successfully',
    });
  } catch (error) {
    console.error('Cover letter generation error:', error);
    
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
}
