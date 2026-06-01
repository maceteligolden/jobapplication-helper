import { getChatMini } from '@/src/infrastructure/llm/openai.client';
import {
  ValidationReportSchema,
  type ValidationReport,
  type GenerationArtifact,
} from '@/src/ai/schemas/generation.schema';
import type { CandidateProfile } from '@/src/ai/schemas/candidateProfile.schema';
import type { JobTypeProfile } from '@/src/ai/schemas/jobTypeProfile.schema';
import type { InterviewLimitation } from '@/src/ai/schemas/interview.schema';

function sectionDeclinedByUser(
  sectionId: string,
  limitations?: InterviewLimitation[] | null
): boolean {
  if (!limitations?.length) return false;
  const map: Record<string, string[]> = {
    projects: ['section_projects', 'projects'],
    certifications: ['section_certifications', 'certifications'],
    portfolio: ['section_portfolio', 'portfolio'],
    technical_skills: ['technical_skills', 'skills'],
  };
  const keys = map[sectionId] ?? [sectionId];
  return limitations.some(
    (l) =>
      l.probeKind === 'section' &&
      keys.some((k) => l.topicId.includes(k) || l.implication.toLowerCase().includes(sectionId.replace(/_/g, ' ')))
  );
}

function ruleBasedAtsCheck(
  artifacts: GenerationArtifact,
  jobTypeProfile?: JobTypeProfile | null,
  interviewLimitations?: InterviewLimitation[] | null
): { score: number; issues: string[]; informational: string[] } {
  const issues: string[] = [];
  const informational: string[] = [];
  let score = 100;
  const atsCv = artifacts.atsCv;
  const lower = atsCv.toLowerCase();

  if (!lower.includes('experience') && !lower.includes('employment')) {
    issues.push('Missing experience section');
    score -= 20;
  }
  if (atsCv.length < 200) {
    issues.push('CV too short');
    score -= 30;
  }
  if (atsCv.length > 15000) {
    issues.push('CV very long — may hurt ATS parsing');
    score -= 10;
  }
  if (!/\S+@\S+\.\S+/.test(atsCv) && !lower.includes('email')) {
    issues.push('No contact email detected');
    score -= 10;
  }

  if (jobTypeProfile) {
    for (const sec of jobTypeProfile.requiredSections.filter((s) => s.required)) {
      const idHints: Record<string, string[]> = {
        projects: ['project'],
        certifications: ['certification', 'license'],
        portfolio: ['portfolio', 'github'],
        technical_skills: ['technical', 'skills'],
      };
      const hints = idHints[sec.id] ?? [sec.id.replace(/_/g, ' ')];
      const found =
        artifacts.sections?.some((s) => s.id === sec.id && s.content.trim()) ||
        hints.some((h) => lower.includes(h));

      if (!found) {
        if (sectionDeclinedByUser(sec.id, interviewLimitations)) {
          informational.push(
            `Section omitted by user choice: ${sec.title} (declined during interview)`
          );
        } else {
          issues.push(`Missing required section: ${sec.title}`);
          score -= 15;
        }
      }
    }
  }

  return { score: Math.max(0, score), issues, informational };
}

export async function validateOutputs(
  artifacts: GenerationArtifact,
  candidateProfile: CandidateProfile,
  jobTypeProfile?: JobTypeProfile | null,
  interviewLimitations?: InterviewLimitation[] | null
): Promise<ValidationReport> {
  const atsRules = ruleBasedAtsCheck(artifacts, jobTypeProfile, interviewLimitations);
  const factTexts = new Set<string>();
  candidateProfile.experience.forEach((e) => e.bullets.forEach((b) => factTexts.add(b.toLowerCase())));
  candidateProfile.achievements.forEach((a) => factTexts.add(a.text.toLowerCase()));
  (candidateProfile.projects ?? []).forEach((p) =>
    p.bullets.forEach((b) => factTexts.add(b.toLowerCase()))
  );

  const structured = getChatMini().withStructuredOutput(ValidationReportSchema, {
    name: 'validation_report',
  });

  const llmReport = await structured.invoke([
    {
      role: 'system',
      content: `Validate generated CV for ATS compatibility and hallucinations.
Flag unsupported employers, dates, metrics, or skills. Job type: ${jobTypeProfile?.jobType ?? 'unknown'}.
Missing sections that the user declined in interview are acceptable — note as informational only.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        atsCv: artifacts.atsCv.slice(0, 6000),
        sections: artifacts.sections,
        provenance: artifacts.provenance,
        sourceFacts: Array.from(factTexts).slice(0, 50),
        ruleBasedIssues: atsRules.issues,
        informationalNotes: atsRules.informational,
        ruleBasedAtsScore: atsRules.score,
        requiredSections: jobTypeProfile?.requiredSections,
        interviewLimitations,
      }),
    },
  ]);

  llmReport.atsScore = Math.round((llmReport.atsScore + atsRules.score) / 2);
  llmReport.issues = [
    ...new Set([...llmReport.issues, ...atsRules.issues, ...atsRules.informational]),
  ];
  llmReport.passed =
    llmReport.passed && llmReport.hallucinationFlags.length === 0 && llmReport.atsScore >= 60;
  llmReport.requiresHumanReview =
    llmReport.requiresHumanReview ||
    llmReport.confidence < 0.7 ||
    llmReport.hallucinationFlags.length > 0;

  return llmReport;
}
