import type { CandidateProfile, DatePrecision } from '@/src/ai/schemas/candidateProfile.schema';

export interface DateGap {
  id: string;
  kind: 'experience_start' | 'experience_end' | 'education_start' | 'education_end' | 'certification';
  entityId: string;
  label: string;
  field: 'startDate' | 'endDate' | 'date';
  currentValue: string;
}

const YEAR_ONLY = /^\d{4}$/;
const MONTH_YEAR =
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}$/i;

export function inferDatePrecision(value: string, declared?: DatePrecision): DatePrecision {
  if (declared && declared !== 'unknown') return declared;
  const v = value.trim();
  if (!v) return 'unknown';
  if (MONTH_YEAR.test(v)) return 'month';
  if (YEAR_ONLY.test(v)) return 'year';
  if (/\d{4}/.test(v) && !MONTH_YEAR.test(v)) return 'year';
  return 'unknown';
}

export function detectDateGaps(profile: CandidateProfile): DateGap[] {
  const gaps: DateGap[] = [];

  for (const exp of profile.experience) {
    const startP = inferDatePrecision(exp.startDate, exp.startDatePrecision);
    const endP = exp.current
      ? 'month'
      : inferDatePrecision(exp.endDate, exp.endDatePrecision);

    if (startP !== 'month' && exp.startDate) {
      gaps.push({
        id: `date_exp_start_${exp.id}`,
        kind: 'experience_start',
        entityId: exp.id,
        label: `${exp.position} at ${exp.company}`,
        field: 'startDate',
        currentValue: exp.startDate,
      });
    }
    if (!exp.current && endP !== 'month' && exp.endDate) {
      gaps.push({
        id: `date_exp_end_${exp.id}`,
        kind: 'experience_end',
        entityId: exp.id,
        label: `${exp.position} at ${exp.company}`,
        field: 'endDate',
        currentValue: exp.endDate,
      });
    }
    if (!exp.startDate) {
      gaps.push({
        id: `date_exp_start_${exp.id}`,
        kind: 'experience_start',
        entityId: exp.id,
        label: `${exp.position} at ${exp.company}`,
        field: 'startDate',
        currentValue: '',
      });
    }
  }

  for (const ed of profile.education) {
    const startP = inferDatePrecision(ed.startDate, ed.startDatePrecision);
    if (startP !== 'month' && ed.startDate) {
      gaps.push({
        id: `date_ed_start_${ed.id}`,
        kind: 'education_start',
        entityId: ed.id,
        label: `${ed.degree} at ${ed.institution}`,
        field: 'startDate',
        currentValue: ed.startDate,
      });
    }
  }

  for (const cert of profile.certifications ?? []) {
    const p = inferDatePrecision(cert.date, cert.datePrecision);
    if (p !== 'month' && cert.name) {
      gaps.push({
        id: `date_cert_${cert.id}`,
        kind: 'certification',
        entityId: cert.id,
        label: cert.name,
        field: 'date',
        currentValue: cert.date,
      });
    }
  }

  return gaps;
}

export function dateCompletenessSummary(profile: CandidateProfile): {
  total: number;
  resolved: number;
  gaps: DateGap[];
} {
  const gaps = detectDateGaps(profile);
  const total =
    profile.experience.length * 2 +
    profile.education.length +
    (profile.certifications?.length ?? 0);
  return { total, resolved: Math.max(0, total - gaps.length), gaps };
}
