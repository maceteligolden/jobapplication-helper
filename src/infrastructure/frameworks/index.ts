/**
 * Prompt Framework Exports
 * Centralized export for all prompt frameworks
 */

export * from './promptFramework';
export * from './jobAnalysisFramework';
export * from './cvGenerationFramework';
export * from './cvMatchFramework';

// Register all templates
import { promptFramework } from './promptFramework';
import { jobAnalysisTemplate } from './jobAnalysisFramework';
import { cvGenerationTemplate } from './cvGenerationFramework';
import { cvMatchTemplate } from './cvMatchFramework';

// Auto-register templates
promptFramework.register(jobAnalysisTemplate);
promptFramework.register(cvGenerationTemplate);
promptFramework.register(cvMatchTemplate);
