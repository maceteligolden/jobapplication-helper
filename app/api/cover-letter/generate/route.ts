/**
 * Cover Letter Generation API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCoverLetterText } from '@/src/infrastructure/services/openai.service';
import { isOpenAIConfigured } from '@/src/infrastructure/llm/openai.config';
import type { ApiResponse } from '@/src/shared/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ coverLetter: string }>>> {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { jobDescription, cvContent } = body;

    if (!jobDescription || !cvContent) {
      return NextResponse.json(
        { success: false, error: 'Job description and CV content are required' },
        { status: 400 }
      );
    }

    const coverLetter = await generateCoverLetterText(jobDescription, cvContent);

    return NextResponse.json({
      success: true,
      data: { coverLetter },
      message: 'Cover letter generated successfully',
    });
  } catch (error) {
    console.error('Cover letter generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate cover letter',
      },
      { status: 500 }
    );
  }
}
