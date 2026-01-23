/**
 * CV Analysis API Route
 * Analyzes CV match with job description
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeCVMatch } from '@/src/infrastructure/services/cvAnalyzer.service';
import { analyzeJobDescription } from '@/src/infrastructure/services/jobAnalyzer.service';
import type { ApiResponse } from '@/src/shared/types';
import type { CVMatchAnalysis } from '@/src/infrastructure/services/cvAnalyzer.service';
import type { JobAnalysis } from '@/src/infrastructure/services/jobAnalyzer.service';

export interface AnalyzeResponse {
  jobAnalysis: JobAnalysis;
  cvMatch: CVMatchAnalysis;
}

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/cv/analyze
 * Analyze CV match with job description
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AnalyzeResponse>>> {
  try {
    const body = await request.json();
    const { jobDescription, cvContent } = body;

    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Job description is required',
        },
        { status: 400 }
      );
    }

    if (!cvContent || typeof cvContent !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'CV content is required',
        },
        { status: 400 }
      );
    }

    // Analyze job description first
    const jobAnalysis = await analyzeJobDescription(jobDescription);

    // Analyze CV match
    const cvMatch = await analyzeCVMatch(cvContent, jobDescription, jobAnalysis);

    return NextResponse.json({
      success: true,
      data: {
        jobAnalysis,
        cvMatch,
      },
      message: 'Analysis completed successfully',
    });
  } catch (error) {
    console.error('CV analysis error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to analyze CV. Please try again.',
      },
      { status: 500 }
    );
  }
}
