/**
 * Prompt Framework System
 * Provides structured prompt templates with token estimation and optimization
 */

/**
 * Token estimation utilities
 * Rough approximation: 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
  // More accurate: count words and add overhead
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;
  // Average: 1 token per 4 characters, or 0.75 tokens per word
  return Math.ceil(Math.max(chars / 4, words * 0.75));
}

/**
 * Estimate prompt tokens including system message and response
 */
export function estimatePromptTokens(
  systemMessage: string,
  userMessage: string,
  maxResponseTokens: number = 0
): number {
  const systemTokens = estimateTokens(systemMessage);
  const userTokens = estimateTokens(userMessage);
  return systemTokens + userTokens + maxResponseTokens;
}

/**
 * Prompt template interface
 */
export interface PromptTemplate {
  systemMessage: string;
  buildUserMessage: (data: Record<string, any>) => string;
  estimatedInputTokens: (data: Record<string, any>) => number;
  maxResponseTokens: number;
  name: string;
}

/**
 * Base prompt framework class
 */
export class PromptFramework {
  private templates: Map<string, PromptTemplate> = new Map();

  /**
   * Register a prompt template
   */
  register(template: PromptTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Build a complete prompt from template
   */
  build(templateName: string, data: Record<string, any>): {
    systemMessage: string;
    userMessage: string;
    estimatedTokens: number;
  } {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    const userMessage = template.buildUserMessage(data);
    const estimatedTokens = template.estimatedInputTokens(data) + template.maxResponseTokens;

    return {
      systemMessage: template.systemMessage,
      userMessage,
      estimatedTokens,
    };
  }

  /**
   * Get template by name
   */
  getTemplate(templateName: string): PromptTemplate | undefined {
    return this.templates.get(templateName);
  }
}

/**
 * Global prompt framework instance
 */
export const promptFramework = new PromptFramework();
