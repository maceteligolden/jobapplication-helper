import { NextRequest, NextResponse } from 'next/server';
import { handleInterviewMessage, startInterview } from '@/src/ai/services/workflow.service';
import { isOpenAIConfigured } from '@/src/infrastructure/llm/openai.config';
import type { ApiResponse } from '@/src/shared/types';

export const runtime = 'nodejs';
export const maxDuration = 90;

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
    const body = await request.json();
    const { message, init } = body as { message?: string; init?: boolean };

    if (init) {
      const result = await startInterview(id);
      return NextResponse.json({
        success: true,
        data: {
          assistantMessage: result.assistantMessage,
          interview: result.interview,
          isComplete: result.isComplete,
          probeProgress: result.probeProgress,
          limitations: result.interview?.limitations ?? [],
          userRequestedFinish: result.interview?.userRequestedFinish ?? false,
          limitationsSummary: result.limitationsSummary ?? '',
          state: result.state,
        },
      });
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'message is required' },
        { status: 400 }
      );
    }

    const result = await handleInterviewMessage(id, message);

    return NextResponse.json({
      success: true,
      data: {
        assistantMessage: result.assistantMessage,
        interview: result.interview,
        isComplete: result.isComplete,
        probeProgress: result.probeProgress,
        limitations: result.interview?.limitations ?? [],
        userRequestedFinish: result.interview?.userRequestedFinish ?? false,
        limitationsSummary: result.limitationsSummary ?? '',
        state: result.state,
      },
    });
  } catch (error) {
    console.error('Interview message error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Interview failed',
      },
      { status: 500 }
    );
  }
}
