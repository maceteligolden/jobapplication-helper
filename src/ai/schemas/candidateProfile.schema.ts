import { z } from 'zod';
import { SeniorityLevelSchema } from './roleProfile.schema';
import {
  strictString,
  strictStringArray,
  strictBool,
  strictDatePrecision,
} from './openaiStrict';

export const DatePrecisionSchema = strictDatePrecision();

export const ExperienceEntrySchema = z.object({
  id: z.string(),
  company: z.string(),
  position: z.string(),
  startDate: z.string(),
  endDate: strictString(),
  current: strictBool(),
  startDatePrecision: strictDatePrecision(),
  endDatePrecision: strictDatePrecision(),
  bullets: z.array(z.string()),
  technologies: strictStringArray(),
});

export const EducationEntrySchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  field: strictString(),
  startDate: strictString(),
  endDate: strictString(),
  startDatePrecision: strictDatePrecision(),
  endDatePrecision: strictDatePrecision(),
});

export const ProjectEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: strictString(),
  technologies: strictStringArray(),
  url: strictString(),
  bullets: strictStringArray(),
});

export const CertificationEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: strictString(),
  date: strictString(),
  datePrecision: strictDatePrecision(),
});

export const AchievementSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.enum(['cv', 'interview', 'inferred']),
  sourceId: strictString(),
  confidence: z.number().min(0).max(1),
  metrics: strictStringArray(),
  framework: z.enum(['STAR', 'CAR', 'PAR', 'duty_metric', 'metric', 'duty']),
  employerId: strictString(),
  dateRange: strictString(),
  sectionTarget: z.enum([
    'experience',
    'projects',
    'certifications',
    'summary',
    'skills',
  ]),
});

export const CandidateProfileSchema = z.object({
  personalInfo: z.object({
    fullName: strictString(),
    email: strictString(),
    phone: strictString(),
    location: strictString(),
    linkedIn: strictString(),
    summary: strictString(),
    portfolioUrl: strictString(),
  }),
  experience: z.array(ExperienceEntrySchema),
  education: z.array(EducationEntrySchema),
  skills: z.array(z.string()),
  projects: z.array(ProjectEntrySchema).default([]),
  certifications: z.array(CertificationEntrySchema).default([]),
  achievements: z.array(AchievementSchema),
  inferredSeniority: SeniorityLevelSchema,
  rawText: strictString(),
});

export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;
export type ProjectEntry = z.infer<typeof ProjectEntrySchema>;
export type CertificationEntry = z.infer<typeof CertificationEntrySchema>;
export type DatePrecision = z.infer<typeof DatePrecisionSchema>;
