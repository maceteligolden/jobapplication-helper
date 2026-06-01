import { z } from 'zod';
import { strictString, strictStringArray } from './openaiStrict';

export const JobTypeSchema = z.enum([
  'software_engineering',
  'business_analyst',
  'data_analytics',
  'warehouse_operations',
  'retail_customer_service',
  'healthcare_clinical',
  'project_management',
  'sales',
  'academic_research',
  'executive_leadership',
  'creative_design',
  'other',
]);

export const BulletFrameworkSchema = z.enum(['STAR', 'CAR', 'PAR', 'duty_metric']);

export const CvSectionIdSchema = z.enum([
  'summary',
  'experience',
  'skills',
  'technical_skills',
  'projects',
  'education',
  'certifications',
  'portfolio',
  'availability',
  'tools',
  'publications',
  'other',
]);

export const CvSectionPlanItemSchema = z.object({
  id: CvSectionIdSchema,
  title: z.string(),
  required: z.boolean(),
  reason: strictString(),
});

export const ImplicitTraitProbeSchema = z.object({
  trait: z.string(),
  jdSignal: strictString(),
  evidenceQuestion: z.string(),
  resumeSection: CvSectionIdSchema,
});

export const JobTypeProfileSchema = z.object({
  jobType: JobTypeSchema,
  confidence: z.number().min(0).max(1),
  industryTags: strictStringArray(),
  bulletFramework: BulletFrameworkSchema,
  requiredSections: z.array(CvSectionPlanItemSchema),
  optionalSections: z.array(CvSectionPlanItemSchema),
  implicitTraitsToProbe: z.array(ImplicitTraitProbeSchema),
});

export type JobType = z.infer<typeof JobTypeSchema>;
export type BulletFramework = z.infer<typeof BulletFrameworkSchema>;
export type CvSectionId = z.infer<typeof CvSectionIdSchema>;
export type CvSectionPlanItem = z.infer<typeof CvSectionPlanItemSchema>;
export type ImplicitTraitProbe = z.infer<typeof ImplicitTraitProbeSchema>;
export type JobTypeProfile = z.infer<typeof JobTypeProfileSchema>;
