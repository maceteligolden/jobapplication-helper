/**
 * Q&A questions — delegates to session interview when sessionId provided;
 * legacy batch questions for backward compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/src/infrastructure/services/openai.service';
import { isOpenAIConfigured } from '@/src/infrastructure/llm/openai.config';
import { extractCVInfo } from '@/src/infrastructure/services/cvInfoExtractor.service';
import type { ApiResponse } from '@/src/shared/types';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

const QuestionsSchema = z.array(
  z.object({
    id: z.string(),
    type: z.string(),
    question: z.string(),
    priority: z.number().optional(),
  })
);

const DEFAULT_QUESTIONS = [
  { id: 'q1', type: 'experience', question: 'Describe your most recent role and key achievements.', priority: 1 },
  { id: 'q2', type: 'skills', question: 'What technical or professional skills are you strongest in?', priority: 2 },
  { id: 'q3', type: 'experience', question: 'Share a project where you delivered measurable business impact.', priority: 3 },
];

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json({ success: true, data: DEFAULT_QUESTIONS });
    }

    const body = await request.json();
    const { jobAnalysis, cvMatch, cvContent } = body;

    let cvInfo = null;
    if (cvContent) {
      cvInfo = await extractCVInfo(cvContent);
    }

    const prompt = `Generate 5-8 interview questions as JSON array for a CV builder chatbot.
Job skills: ${jobAnalysis?.idealCandidate?.keySkills?.join(', ') ?? 'N/A'}
Match score: ${cvMatch?.matchScore ?? 'unknown'}
Gaps: ${cvMatch?.missingSkills?.join(', ') ?? cvMatch?.semanticGaps?.join(', ') ?? 'unknown'}
CV already has: ${cvInfo ? JSON.stringify(cvInfo) : 'unknown'}
Skip topics already covered in CV. Return ONLY valid JSON array: [{ "id": "q1", "type": "experience|skills|education|summary", "question": "...", "priority": 1 }]`;

    const response = await generateText(prompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = QuestionsSchema.safeParse(JSON.parse(jsonMatch[0]));
      if (parsed.success) {
        return NextResponse.json({ success: true, data: parsed.data });
      }
    }

    return NextResponse.json({ success: true, data: DEFAULT_QUESTIONS });
  } catch (error) {
    console.error('Generate questions error:', error);
    return NextResponse.json({ success: true, data: DEFAULT_QUESTIONS });
  }
}
