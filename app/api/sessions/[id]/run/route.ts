import { NextRequest, NextResponse } from 'next/server';
import { runAnalyzePipeline, runFullPipeline, runGeneratePipeline } from '@/src/ai/services/workflow.service';
import { isOpenAIConfigured } from '@/src/infrastructure/llm/openai.config';
import type { ApiResponse } from '@/src/shared/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY is not configured' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { resumeText, mode, userOverride } = body as {
      resumeText?: string;
      mode?: 'analyze' | 'full' | 'generate';
      userOverride?: 'interview' | 'generate';
    };

    let state;
    if (mode === 'generate') {
      state = await runGeneratePipeline(id, resumeText);
    } else if (mode === 'full') {
      state = await runFullPipeline(id, { resumeText, userOverride });
    } else {
      state = await runAnalyzePipeline(id, resumeText);
    }

    return NextResponse.json({
      success: true,
      data: state,
      message: 'Workflow completed',
    });
  } catch (error) {
    console.error('Workflow run error:', error);
    const message = error instanceof Error ? error.message : 'Workflow failed';
    const isNotFound = message.includes('Session not found');
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
