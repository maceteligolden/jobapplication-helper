import { z } from 'zod';
import { strictString } from './openaiStrict';

export const ScoreDimensionSchema = z.object({
  score: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
  reasoning: z.string(),
  evidence: z.array(z.string()),
});

export const EvidenceItemSchema = z.object({
  text: z.string(),
  source: z.enum(['cv', 'jd']),
  dimension: strictString(),
});

export const GapCategorySchema = z.enum([
  'skill',
  'experience',
  'trait',
  'certification',
  'date',
  'section',
]);

export const GapItemSchema = z.object({
  id: strictString(),
  requirement: z.string(),
  severity: z.enum(['critical', 'moderate', 'minor']),
  suggestion: z.string(),
  category: GapCategorySchema.default('skill'),
  relatedTrait: strictString(),
});

export const ActionItemSchema = z.object({
  action: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
});

export const MatchReportSchema = z.object({
  overallFit: z.number().min(0).max(100),
  dimensions: z.object({
    semanticAlignment: ScoreDimensionSchema,
    competencyInference: ScoreDimensionSchema,
    experienceRelevance: ScoreDimensionSchema,
    seniorityAlignment: ScoreDimensionSchema,
    industryDomainFit: ScoreDimensionSchema,
    achievementQuality: ScoreDimensionSchema,
    atsKeywordCoverage: ScoreDimensionSchema,
  }),
  strengths: z.array(EvidenceItemSchema),
  gaps: z.array(GapItemSchema),
  improvementActions: z.array(ActionItemSchema),
  confidence: z.number().min(0).max(1),
  routingRecommendation: z.enum(['interview_full', 'interview_targeted', 'generate', 'human_review']),
});

export type MatchReport = z.infer<typeof MatchReportSchema>;
export type GapItem = z.infer<typeof GapItemSchema>;
export type GapCategory = z.infer<typeof GapCategorySchema>;
export type ScoreDimension = z.infer<typeof ScoreDimensionSchema>;
