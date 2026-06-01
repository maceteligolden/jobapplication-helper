import { z } from 'zod';
import { strictString, strictStringArray } from './openaiStrict';

export const RoleArchetypeSchema = z.enum([
  'engineering',
  'academic',
  'executive',
  'corporate',
  'creative',
  'other',
]);

export const SeniorityLevelSchema = z.enum([
  'intern',
  'junior',
  'mid',
  'senior',
  'lead',
  'principal',
  'executive',
]);

export const RoleIntelligenceProfileSchema = z.object({
  title: strictString(),
  company: strictString(),
  archetype: RoleArchetypeSchema,
  seniority: SeniorityLevelSchema,
  industry: z.string(),
  region: strictString(),
  hardRequirements: strictStringArray(),
  softRequirements: strictStringArray(),
  hiddenExpectations: strictStringArray(),
  successMetrics: strictStringArray(),
  hiringPriorities: strictStringArray(),
  keySkills: strictStringArray(),
  writingTone: z.string(),
  sectionPriority: strictStringArray(),
  keywords: strictStringArray(),
});

export type RoleIntelligenceProfile = z.infer<typeof RoleIntelligenceProfileSchema>;
export type RoleArchetype = z.infer<typeof RoleArchetypeSchema>;
export type SeniorityLevel = z.infer<typeof SeniorityLevelSchema>;
