/**
 * Hugging Face Connection Verification API Route
 * Tests the connection to Hugging Face API
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getConnectionStatus } from '@/src/infrastructure/services/huggingface.service';
import type { ApiResponse } from '@/src/shared/types';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds timeout

/**
 * GET /api/hf/verify
 * Verify Hugging Face API connection
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<{
  connected: boolean;
  tokenFound: boolean;
  tokenPrefix: string;
  providers?: Array<{
    name: string;
    enabled: boolean;
    active: boolean;
    status?: string;
  }>;
  error?: string;
  timestamp: Date;
  status: {
    initialized: boolean;
    lastCheck: Date | null;
  };
}>>> {
  try {
    console.log('[API] /api/hf/verify - Connection verification requested');
    
    const connectionStatus = getConnectionStatus();
    const verification = await verifyConnection();
    
    return NextResponse.json({
      success: true,
      data: {
        ...verification,
        status: {
          initialized: connectionStatus.initialized,
          lastCheck: connectionStatus.lastCheck,
        },
      },
      message: verification.connected 
        ? 'Hugging Face connection verified successfully' 
        : 'Hugging Face connection failed',
    });
  } catch (error) {
    console.error('[API] /api/hf/verify - Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to verify connection. Please try again.',
      },
      { status: 500 }
    );
  }
}
