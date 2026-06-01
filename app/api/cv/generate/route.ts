/**
 * CV Generation API Route — OpenAI via LangGraph agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCV } from '@/src/infrastructure/services/openai.service';
import { isOpenAIConfigured } from '@/src/infrastructure/llm/openai.config';
import type { ApiResponse } from '@/src/shared/types';
import type { JobAnalysis } from '@/src/infrastructure/services/jobAnalyzer.service';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<string>>> {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { jobDescription, cvContent, cvData, jobAnalysis } = body as {
      jobDescription: string;
      cvContent?: string;
      cvData?: string;
      jobAnalysis?: JobAnalysis | null;
    };

    const content =
      (typeof cvContent === 'string' && cvContent) ||
      (typeof cvData === 'string' && cvData) ||
      '';

    if (!jobDescription) {
      return NextResponse.json(
        { success: false, error: 'Job description is required' },
        { status: 400 }
      );
    }

    const optimizedCV = await generateCV(jobDescription, content, jobAnalysis ?? null);

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
        error: error instanceof Error ? error.message : 'Failed to generate CV',
      },
      { status: 500 }
    );
  }
}
