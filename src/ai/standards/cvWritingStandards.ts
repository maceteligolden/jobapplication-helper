import type {
  BulletFramework,
  CvSectionPlanItem,
  JobType,
  JobTypeProfile,
} from '@/src/ai/schemas/jobTypeProfile.schema';

export interface JobTypeStandardsDefaults {
  bulletFramework: BulletFramework;
  requiredSections: CvSectionPlanItem[];
  optionalSections: CvSectionPlanItem[];
}

const section = (
  id: CvSectionPlanItem['id'],
  title: string,
  required: boolean,
  reason: string
): CvSectionPlanItem => ({ id, title, required, reason });

const STANDARDS_BY_JOB_TYPE: Record<JobType, JobTypeStandardsDefaults> = {
  software_engineering: {
    bulletFramework: 'STAR',
    requiredSections: [
      section('summary', 'Professional Summary', true, 'Role context and seniority'),
      section('experience', 'Experience', true, 'Core employment history'),
      section('technical_skills', 'Technical Skills', true, 'Stack and tools'),
      section('projects', 'Selected Projects', true, 'Demonstrates hands-on delivery'),
      section('education', 'Education', true, 'Qualifications'),
    ],
    optionalSections: [
      section('certifications', 'Certifications', false, 'Cloud or vendor certs'),
      section('portfolio', 'Portfolio', false, 'GitHub or live demos'),
    ],
  },
  business_analyst: {
    bulletFramework: 'CAR',
    requiredSections: [
      section('summary', 'Professional Summary', true, 'BA focus'),
      section('experience', 'Experience', true, 'Requirements and delivery'),
      section('skills', 'Skills', true, 'Analysis and stakeholder skills'),
      section('tools', 'Tools', true, 'Jira, SQL, etc.'),
      section('education', 'Education', true, 'Qualifications'),
    ],
    optionalSections: [section('certifications', 'Certifications', false, 'CBAP, Agile certs')],
  },
  data_analytics: {
    bulletFramework: 'STAR',
    requiredSections: [
      section('summary', 'Professional Summary', true, 'Analytics focus'),
      section('experience', 'Experience', true, 'Data work history'),
      section('technical_skills', 'Technical Skills', true, 'SQL, Python, BI tools'),
      section('projects', 'Projects', true, 'Analysis outcomes'),
      section('education', 'Education', true, 'Qualifications'),
    ],
    optionalSections: [section('certifications', 'Certifications', false, 'Data platform certs')],
  },
  warehouse_operations: {
    bulletFramework: 'duty_metric',
    requiredSections: [
      section('experience', 'Experience', true, 'Operational roles'),
      section('certifications', 'Licenses & Certifications', true, 'Forklift, safety, licenses'),
      section('skills', 'Skills', true, 'Equipment and processes'),
      section('availability', 'Availability', false, 'Shifts if relevant'),
    ],
    optionalSections: [section('summary', 'Summary', false, 'Brief intro')],
  },
  retail_customer_service: {
    bulletFramework: 'duty_metric',
    requiredSections: [
      section('experience', 'Experience', true, 'Customer-facing roles'),
      section('skills', 'Skills', true, 'Service and POS'),
      section('education', 'Education', false, 'If listed on JD'),
    ],
    optionalSections: [section('certifications', 'Certifications', false, 'Food safety, etc.')],
  },
  healthcare_clinical: {
    bulletFramework: 'PAR',
    requiredSections: [
      section('experience', 'Clinical Experience', true, 'Patient care roles'),
      section('certifications', 'Licenses & Certifications', true, 'Clinical licenses'),
      section('education', 'Education', true, 'Degrees and training'),
      section('skills', 'Clinical Skills', true, 'Procedures and systems'),
    ],
    optionalSections: [section('summary', 'Summary', false, 'Clinical focus')],
  },
  project_management: {
    bulletFramework: 'CAR',
    requiredSections: [
      section('summary', 'Professional Summary', true, 'PM scope'),
      section('experience', 'Experience', true, 'Project delivery'),
      section('skills', 'Skills', true, 'Methodologies and tools'),
      section('certifications', 'Certifications', false, 'PMP, PRINCE2 if applicable'),
      section('education', 'Education', true, 'Qualifications'),
    ],
    optionalSections: [],
  },
  sales: {
    bulletFramework: 'CAR',
    requiredSections: [
      section('summary', 'Professional Summary', true, 'Sales focus'),
      section('experience', 'Experience', true, 'Quota and pipeline'),
      section('skills', 'Skills', true, 'CRM and negotiation'),
      section('education', 'Education', false, 'If relevant'),
    ],
    optionalSections: [section('certifications', 'Certifications', false, 'Sales training')],
  },
  academic_research: {
    bulletFramework: 'PAR',
    requiredSections: [
      section('summary', 'Research Summary', true, 'Field and focus'),
      section('experience', 'Research Experience', true, 'Labs and grants'),
      section('publications', 'Publications', true, 'Academic output'),
      section('education', 'Education', true, 'Degrees'),
      section('skills', 'Technical Skills', true, 'Methods and tools'),
    ],
    optionalSections: [section('certifications', 'Certifications', false, 'Professional memberships')],
  },
  executive_leadership: {
    bulletFramework: 'CAR',
    requiredSections: [
      section('summary', 'Executive Summary', true, 'Leadership narrative'),
      section('experience', 'Experience', true, 'P&L and org leadership'),
      section('skills', 'Core Competencies', true, 'Strategic skills'),
      section('education', 'Education', true, 'Credentials'),
    ],
    optionalSections: [section('certifications', 'Board & Certifications', false, 'Executive programs')],
  },
  creative_design: {
    bulletFramework: 'STAR',
    requiredSections: [
      section('summary', 'Profile', true, 'Creative focus'),
      section('experience', 'Experience', true, 'Agency or in-house'),
      section('projects', 'Portfolio Highlights', true, 'Work samples'),
      section('skills', 'Skills & Tools', true, 'Design stack'),
      section('portfolio', 'Portfolio', true, 'Link to work'),
    ],
    optionalSections: [section('education', 'Education', false, 'Formal training')],
  },
  other: {
    bulletFramework: 'CAR',
    requiredSections: [
      section('summary', 'Professional Summary', true, 'Role fit'),
      section('experience', 'Experience', true, 'Work history'),
      section('skills', 'Skills', true, 'Relevant skills'),
      section('education', 'Education', true, 'Qualifications'),
    ],
    optionalSections: [section('certifications', 'Certifications', false, 'If JD requires')],
  },
};

export function getStandardsForJobType(jobType: JobType): JobTypeStandardsDefaults {
  return STANDARDS_BY_JOB_TYPE[jobType] ?? STANDARDS_BY_JOB_TYPE.other;
}

/** Merge LLM classifier output with registry defaults when confidence is low. */
export function mergeJobTypeProfile(classified: JobTypeProfile): JobTypeProfile {
  const defaults = getStandardsForJobType(classified.jobType);
  const useDefaults = classified.confidence < 0.65;

  return {
    ...classified,
    bulletFramework: classified.bulletFramework || defaults.bulletFramework,
    requiredSections:
      useDefaults || classified.requiredSections.length === 0
        ? defaults.requiredSections
        : classified.requiredSections,
    optionalSections:
      useDefaults || classified.optionalSections.length === 0
        ? defaults.optionalSections
        : classified.optionalSections,
  };
}

export function sectionTitles(profile: JobTypeProfile): string[] {
  return [
    ...profile.requiredSections.map((s) => s.title),
    ...profile.optionalSections.filter((s) => s.required).map((s) => s.title),
  ];
}
