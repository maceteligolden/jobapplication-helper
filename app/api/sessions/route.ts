import { NextRequest, NextResponse } from 'next/server';
import { createWorkflowSession } from '@/src/ai/services/workflow.service';
import { isOpenAIConfigured } from '@/src/infrastructure/llm/openai.config';
import type { ApiResponse } from '@/src/shared/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ sessionId: string }>>> {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { jobDescription } = body;

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.length < 50) {
      return NextResponse.json(
        { success: false, error: 'Job description is required (min 50 characters)' },
        { status: 400 }
      );
    }

    const session = await createWorkflowSession(jobDescription);

    return NextResponse.json({
      success: true,
      data: { sessionId: session.id },
      message: 'Session created',
    });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
      },
      { status: 500 }
    );
  }
}
