import { NextRequest } from 'next/server';
import { getWorkflowState } from '@/src/ai/services/workflow.service';
import { createStreamingChat } from '@/src/infrastructure/llm/openai.client';

export const runtime = 'nodejs';
export const maxDuration = 90;

/**
 * SSE stream for interview assistant replies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const message = request.nextUrl.searchParams.get('message');

  const state = await getWorkflowState(id);
  if (!state?.roleProfile) {
    return new Response(JSON.stringify({ error: 'Session not ready' }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const chat = createStreamingChat();
        const history =
          state.interview?.messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })) ?? [];

        if (message) {
          history.push({ role: 'user', content: message });
        }

        const tokenStream = await chat.stream([
          {
            role: 'system',
            content: `You are a senior recruiter interviewing for a ${state.roleProfile!.archetype} role (${state.roleProfile!.seniority}). Ask one focused question or follow-up.`,
          },
          ...history,
        ]);

        for await (const chunk of tokenStream) {
          const text =
            typeof chunk.content === 'string'
              ? chunk.content
              : Array.isArray(chunk.content)
                ? chunk.content.map((c) => ('text' in c ? c.text : '')).join('')
                : '';
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: e instanceof Error ? e.message : 'Stream failed' })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
