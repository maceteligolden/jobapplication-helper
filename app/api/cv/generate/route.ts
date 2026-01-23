/**
 * CV Generation API Route
 * Handles CV generation requests using Hugging Face
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCV } from '@/src/infrastructure/services/huggingface.service';
import type { ApiResponse } from '@/src/shared/types';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

/**
 * POST /api/cv/generate
 * Generate optimized CV based on job description and CV data
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<string>>> {
  try {
    const body = await request.json();
    const { jobDescription, cvData, jobAnalysis } = body;

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

    // Generate CV with job analysis if available
    const optimizedCV = await generateCV(jobDescription, cvData, jobAnalysis);

    return NextResponse.json({
      success: true,
      data: optimizedCV,
      message: 'CV generated successfully',
    });
  } catch (error) {
    console.error('CV generation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate CV. Please try again.',
      },
      { status: 500 }
    );
  }
}
