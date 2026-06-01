import { z } from 'zod';
import { strictString } from './openaiStrict';
import { CvSectionIdSchema } from './jobTypeProfile.schema';

export const ProvenanceEntrySchema = z.object({
  bulletText: z.string(),
  source: z.enum(['cv', 'interview', 'inferred']),
  sourceId: strictString(),
  originalText: strictString(),
});

export const CvSectionOutputSchema = z.object({
  id: CvSectionIdSchema,
  title: z.string(),
  content: z.string(),
});

export const GenerationArtifactSchema = z.object({
  atsCv: z.string(),
  humanCv: z.string(),
  coverLetter: strictString(),
  sections: z.array(CvSectionOutputSchema).default([]),
  provenance: z.array(ProvenanceEntrySchema),
});

export const ValidationReportSchema = z.object({
  passed: z.boolean(),
  confidence: z.number().min(0).max(1),
  atsScore: z.number().min(0).max(100),
  issues: z.array(z.string()),
  hallucinationFlags: z.array(z.string()),
  requiresHumanReview: z.boolean(),
});

export type GenerationArtifact = z.infer<typeof GenerationArtifactSchema>;
export type ValidationReport = z.infer<typeof ValidationReportSchema>;
export type ProvenanceEntry = z.infer<typeof ProvenanceEntrySchema>;
export type CvSectionOutput = z.infer<typeof CvSectionOutputSchema>;
