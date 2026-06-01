/**
 * CV Info Extractor — OpenAI structured extraction
 */

import { profileCandidate } from '@/src/ai/agents/candidateProfiler.agent';
import type { CandidateProfile } from '@/src/ai/schemas/candidateProfile.schema';

export interface ExtractedCVInfo {
  hasPersonalInfo: boolean;
  hasExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
  hasSummary: boolean;
  email?: string;
  phone?: string;
  skillCount: number;
  experienceCount: number;
  missingSections: string[];
}

export async function extractCVInfo(cvContent: string): Promise<ExtractedCVInfo> {
  if (!cvContent?.trim()) {
    return {
      hasPersonalInfo: false,
      hasExperience: false,
      hasEducation: false,
      hasSkills: false,
      hasSummary: false,
      skillCount: 0,
      experienceCount: 0,
      missingSections: ['personal_info', 'experience', 'education', 'skills', 'summary'],
    };
  }

  let profile: CandidateProfile;
  try {
    profile = await profileCandidate(cvContent);
  } catch {
    return fallbackExtract(cvContent);
  }

  const missingSections: string[] = [];
  if (!profile.personalInfo.fullName && !profile.personalInfo.email) {
    missingSections.push('personal_info');
  }
  if (profile.experience.length === 0) missingSections.push('experience');
  if (profile.education.length === 0) missingSections.push('education');
  if (profile.skills.length === 0) missingSections.push('skills');
  if (!profile.personalInfo.summary) missingSections.push('summary');

  return {
    hasPersonalInfo: Boolean(profile.personalInfo.fullName || profile.personalInfo.email),
    hasExperience: profile.experience.length > 0,
    hasEducation: profile.education.length > 0,
    hasSkills: profile.skills.length > 0,
    hasSummary: Boolean(profile.personalInfo.summary),
    email: profile.personalInfo.email,
    phone: profile.personalInfo.phone,
    skillCount: profile.skills.length,
    experienceCount: profile.experience.length,
    missingSections,
  };
}

function fallbackExtract(cvContent: string): ExtractedCVInfo {
  const emailMatch = cvContent.match(/\S+@\S+\.\S+/);
  const hasExperience = /experience|employment|work history/i.test(cvContent);
  return {
    hasPersonalInfo: Boolean(emailMatch),
    hasExperience,
    hasEducation: /education|university|degree/i.test(cvContent),
    hasSkills: /skills/i.test(cvContent),
    hasSummary: /summary|profile|about/i.test(cvContent),
    email: emailMatch?.[0],
    skillCount: 0,
    experienceCount: 0,
    missingSections: [],
  };
}
