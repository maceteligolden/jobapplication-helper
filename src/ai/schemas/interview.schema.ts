import { z } from 'zod';
import { AchievementSchema } from './candidateProfile.schema';
import { strictString, strictStringArray } from './openaiStrict';

export const TopicCoverageSchema = z.object({
  topic: z.string(),
  topicId: strictString(),
  covered: z.boolean(),
  quality: z.number().min(0).max(1),
  attempts: z.number().int().min(0),
});

export const InterviewMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string(),
});

export const InterviewProbeSchema = z.object({
  id: z.string(),
  kind: z.enum(['date', 'gap', 'trait', 'section', 'achievement']),
  prompt: z.string(),
  topicId: strictString(),
  status: z.enum(['pending', 'in_progress', 'done', 'skipped']).default('pending'),
});

export const InterviewLimitationSchema = z.object({
  topicId: strictString(),
  probeKind: z.enum(['date', 'gap', 'trait', 'section', 'achievement']),
  implication: z.string(),
  declinedAt: strictString(),
});

export const InterviewStateSchema = z.object({
  messages: z.array(InterviewMessageSchema),
  topicCoverage: z.array(TopicCoverageSchema),
  extractedFacts: z.array(AchievementSchema),
  probeQueue: z.array(InterviewProbeSchema).default([]),
  limitations: z.array(InterviewLimitationSchema).default([]),
  userRequestedFinish: z.boolean().default(false),
  summary: z.string(),
  isComplete: z.boolean(),
  currentTopic: strictString(),
  currentProbeId: strictString(),
  turnCount: z.number().int(),
});

export const AnswerEvaluationSchema = z.object({
  completeness: z.number().min(0).max(1),
  specificity: z.number().min(0).max(1),
  relevance: z.number().min(0).max(1),
  isOffTopic: z.boolean(),
  followUpNeeded: z.boolean(),
  followUpQuestion: strictString(),
  hasMetrics: z.boolean().default(false),
  userDeclined: z.boolean().default(false),
  declineKind: z
    .enum(['unknown', 'not_applicable', 'no_permission', 'skip_request'])
    .default('unknown'),
  implicationForCv: strictString(),
  extractedFacts: z.array(
    z.object({
      text: z.string(),
      metrics: strictStringArray(),
      framework: z.enum(['STAR', 'CAR', 'PAR', 'duty_metric', 'metric', 'duty']).default('metric'),
      employerId: strictString(),
      dateRange: strictString(),
      sectionTarget: z
        .enum(['experience', 'projects', 'certifications', 'summary', 'skills'])
        .default('experience'),
      situation: strictString(),
      task: strictString(),
      action: strictString(),
      result: strictString(),
    })
  ),
});

export type InterviewState = z.infer<typeof InterviewStateSchema>;
export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;
export type InterviewProbe = z.infer<typeof InterviewProbeSchema>;
export type InterviewLimitation = z.infer<typeof InterviewLimitationSchema>;
