/**
 * Central OpenAI model configuration
 */

export const OPENAI_MODELS = {
  FAST: 'gpt-4o-mini',
  STRONG: 'gpt-4o',
  EMBEDDING: 'text-embedding-3-small',
} as const;

export function getOpenAIApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return key;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
