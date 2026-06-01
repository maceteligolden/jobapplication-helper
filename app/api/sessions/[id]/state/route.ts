import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowState } from '@/src/ai/services/workflow.service';
import type { ApiResponse } from '@/src/shared/types';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params;
    const state = await getWorkflowState(id);
    if (!state) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: state });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get state',
      },
      { status: 500 }
    );
  }
}
