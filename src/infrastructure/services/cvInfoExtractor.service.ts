/**
 * CV Information Extractor Service
 * Extracts structured information from CV content to avoid asking redundant questions
 */

import { generateText } from './huggingface.service';
import { HUGGINGFACE_MODELS } from '@/src/shared/constants';

export interface ExtractedCVInfo {
  personalInfo: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  experience: Array<{
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;
  education: Array<{
    degree?: string;
    institution?: string;
    field?: string;
    year?: string;
  }>;
  skills: string[];
  certifications: string[];
  summary?: string;
  hasPersonalInfo: boolean;
  hasExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
}

/**
 * Extract structured information from CV content
 */
export async function extractCVInfo(cvContent: string): Promise<ExtractedCVInfo> {
  if (!cvContent || cvContent.trim().length === 0) {
    return {
      personalInfo: {},
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      hasPersonalInfo: false,
      hasExperience: false,
      hasEducation: false,
      hasSkills: false,
    };
  }

  const extractionPrompt = `Extract structured information from this CV content. Identify what information is present and what is missing.

CV Content:
${cvContent}

Extract and return ONLY a JSON object with this exact structure:
{
  "personalInfo": {
    "fullName": "extracted name or null",
    "email": "extracted email or null",
    "phone": "extracted phone or null",
    "location": "extracted location or null"
  },
  "experience": [
    {
      "title": "job title or null",
      "company": "company name or null",
      "duration": "duration or null",
      "description": "brief description or null"
    }
  ],
  "education": [
    {
      "degree": "degree name or null",
      "institution": "school name or null",
      "field": "field of study or null",
      "year": "graduation year or null"
    }
  ],
  "skills": ["skill1", "skill2"],
  "certifications": ["cert1", "cert2"],
  "summary": "professional summary if present or null"
}

Be thorough but only include information that is clearly present in the CV. If information is missing or unclear, use null or empty arrays.`;

  try {
    const response = await generateText(
      extractionPrompt,
      HUGGINGFACE_MODELS.CV_GENERATION,
      2000
    );

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]) as Omit<ExtractedCVInfo, 'hasPersonalInfo' | 'hasExperience' | 'hasEducation' | 'hasSkills'>;
      
      // Calculate boolean flags
      const hasPersonalInfo = !!(
        extracted.personalInfo?.fullName ||
        extracted.personalInfo?.email ||
        extracted.personalInfo?.phone
      );
      
      const hasExperience = extracted.experience && extracted.experience.length > 0 &&
        extracted.experience.some(exp => exp.title || exp.company);
      
      const hasEducation = extracted.education && extracted.education.length > 0 &&
        extracted.education.some(edu => edu.degree || edu.institution);
      
      const hasSkills = extracted.skills && extracted.skills.length > 0;

      return {
        ...extracted,
        personalInfo: extracted.personalInfo || {},
        experience: extracted.experience || [],
        education: extracted.education || [],
        skills: extracted.skills || [],
        certifications: extracted.certifications || [],
        hasPersonalInfo,
        hasExperience,
        hasEducation,
        hasSkills,
      };
    }
  } catch (error) {
    console.error('CV info extraction error:', error);
  }

  // Fallback: basic extraction using regex patterns
  return extractBasicInfo(cvContent);
}

/**
 * Basic information extraction using regex patterns
 */
function extractBasicInfo(cvContent: string): ExtractedCVInfo {
  const info: ExtractedCVInfo = {
    personalInfo: {},
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    hasPersonalInfo: false,
    hasExperience: false,
    hasEducation: false,
    hasSkills: false,
  };

  // Extract email
  const emailMatch = cvContent.match(/[\w.-]+@[\w.-]+\.\w+/i);
  if (emailMatch) {
    info.personalInfo.email = emailMatch[0];
    info.hasPersonalInfo = true;
  }

  // Extract phone (various formats)
  const phoneMatch = cvContent.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    info.personalInfo.phone = phoneMatch[0];
    info.hasPersonalInfo = true;
  }

  // Check for common skill keywords
  const skillKeywords = [
    'javascript', 'python', 'react', 'node', 'typescript', 'java', 'c++', 'sql',
    'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum', 'leadership',
    'project management', 'data analysis', 'machine learning', 'ai'
  ];
  
  const foundSkills: string[] = [];
  for (const skill of skillKeywords) {
    if (cvContent.toLowerCase().includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  }
  
  if (foundSkills.length > 0) {
    info.skills = foundSkills;
    info.hasSkills = true;
  }

  // Check for experience indicators
  const experienceIndicators = ['experience', 'worked at', 'employed', 'position', 'role', 'job'];
  const hasExperience = experienceIndicators.some(indicator =>
    cvContent.toLowerCase().includes(indicator)
  );
  info.hasExperience = hasExperience;

  // Check for education indicators
  const educationIndicators = ['university', 'college', 'degree', 'bachelor', 'master', 'phd', 'education'];
  const hasEducation = educationIndicators.some(indicator =>
    cvContent.toLowerCase().includes(indicator)
  );
  info.hasEducation = hasEducation;

  return info;
}
