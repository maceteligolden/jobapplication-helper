/**
 * LangSmith tracing configuration
 */

export function configureLangSmith(): void {
  if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
    process.env.LANGCHAIN_PROJECT =
      process.env.LANGCHAIN_PROJECT ?? 'jobcv-platform';
  }
}

export function getTraceMetadata(sessionId: string, node?: string) {
  return {
    sessionId,
    ...(node ? { node } : {}),
  };
}
