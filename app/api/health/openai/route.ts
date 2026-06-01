import { NextResponse } from 'next/server';
import { isOpenAIConfigured } from '@/src/infrastructure/llm/openai.config';
import { getChatMini } from '@/src/infrastructure/llm/openai.client';

export const runtime = 'nodejs';

export async function GET() {
  if (!isOpenAIConfigured()) {
    return NextResponse.json({
      success: false,
      configured: false,
      error: 'OPENAI_API_KEY is not set',
    });
  }

  try {
    const response = await getChatMini().invoke([{ role: 'user', content: 'Reply with OK only.' }]);
    const text = typeof response.content === 'string' ? response.content : 'OK';
    return NextResponse.json({
      success: true,
      configured: true,
      message: text.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      configured: true,
      error: error instanceof Error ? error.message : 'OpenAI connection failed',
    });
  }
}
