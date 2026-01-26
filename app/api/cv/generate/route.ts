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
  const requestId = `cv-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();
  
  console.log(`[API] [${requestId}] POST /api/cv/generate - CV generation requested`);
  
  try {
    const body = await request.json();
    const { jobDescription, cvData, jobAnalysis } = body;

    console.log(`[API] [${requestId}] Request validation...`);
    console.log(`[API] [${requestId}] Job description length: ${jobDescription?.length || 0}`);
    console.log(`[API] [${requestId}] CV data length: ${cvData?.length || 0}`);
    console.log(`[API] [${requestId}] Job analysis provided: ${!!jobAnalysis}`);

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

    console.log(`[API] [${requestId}] ✅ Validation passed, starting CV generation...`);
    
    // Generate CV with job analysis if available
    const optimizedCV = await generateCV(jobDescription, cvData, jobAnalysis);

    const totalTime = Date.now() - startTime;
    console.log(`[API] [${requestId}] ✅ CV generation completed in ${totalTime}ms`);
    console.log(`[API] [${requestId}] Generated CV length: ${optimizedCV.length} characters`);

    return NextResponse.json({
      success: true,
      data: optimizedCV,
      message: 'CV generated successfully',
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[API] [${requestId}] ❌ CV generation error after ${totalTime}ms:`, error);
    
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
