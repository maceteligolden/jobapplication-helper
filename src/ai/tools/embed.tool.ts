/**
 * Embedding utilities with Redis/in-memory cache
 */

import { getEmbeddings } from '@/src/infrastructure/llm/openai.client';

const embedCache = new Map<string, number[]>();

function cacheKey(text: string): string {
  return `emb:${text.slice(0, 200).replace(/\s+/g, ' ')}`;
}

export async function embedText(text: string): Promise<number[]> {
  const key = cacheKey(text);
  const cached = embedCache.get(key);
  if (cached) return cached;
  const vector = await getEmbeddings().embedQuery(text);
  embedCache.set(key, vector);
  return vector;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const uncached: { index: number; text: string }[] = [];
  const results: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i++) {
    const key = cacheKey(texts[i]);
    const cached = embedCache.get(key);
    if (cached) {
      results[i] = cached;
    } else {
      uncached.push({ index: i, text: texts[i] });
    }
  }

  if (uncached.length > 0) {
    const vectors = await getEmbeddings().embedDocuments(uncached.map((u) => u.text));
    uncached.forEach((u, j) => {
      const vec = vectors[j];
      embedCache.set(cacheKey(u.text), vec);
      results[u.index] = vec;
    });
  }

  return results;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function semanticSimilarity(textA: string, textB: string): Promise<number> {
  const [a, b] = await embedTexts([textA, textB]);
  return cosineSimilarity(a, b);
}
