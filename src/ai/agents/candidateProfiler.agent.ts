import { toJsonSchema } from '@langchain/core/utils/json_schema';
import { getChatMini } from '@/src/infrastructure/llm/openai.client';
import {
  CandidateProfileSchema,
  type CandidateProfile,
} from '@/src/ai/schemas/candidateProfile.schema';
import { normalizeResumeText } from '@/src/ai/tools/parseResume.tool';
import { inferDatePrecision } from '@/src/ai/utils/dateGapDetector';

function schemaRefHasDefaultOnRef(schema: unknown, path: string[] = []): string[] {
  const issues: string[] = [];
  if (!schema || typeof schema !== 'object') return issues;
  const s = schema as Record<string, unknown>;
  if (s.$ref && ('default' in s || 'title' in s)) {
    issues.push([...path, String(s.$ref)].join('.'));
  }
  for (const [key, val] of Object.entries(s)) {
    if (key === 'properties' && val && typeof val === 'object') {
      for (const [prop, sub] of Object.entries(val as Record<string, unknown>)) {
        issues.push(...schemaRefHasDefaultOnRef(sub, [...path, prop]));
      }
    } else if (key === 'items') {
      issues.push(...schemaRefHasDefaultOnRef(val, [...path, 'items']));
    } else if (typeof val === 'object') {
      issues.push(...schemaRefHasDefaultOnRef(val, path));
    }
  }
  return issues;
}

export async function profileCandidate(resumeRawText: string): Promise<CandidateProfile> {
  const normalized = normalizeResumeText(resumeRawText);
  const structured = getChatMini().withStructuredOutput(CandidateProfileSchema, {
    name: 'candidate_profile',
  });

  // #region agent log
  try {
    const jsonSchema = toJsonSchema(CandidateProfileSchema);
    const refIssues = schemaRefHasDefaultOnRef(jsonSchema);
    fetch('http://127.0.0.1:7845/ingest/3b4333d1-9478-4155-a0c2-6acee25e28ec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7f082c' },
      body: JSON.stringify({
        sessionId: '7f082c',
        location: 'candidateProfiler.agent.ts:pre-invoke',
        message: 'candidate_profile JSON schema check',
        data: {
          refIssuesWithDefaultOnRef: refIssues,
          experienceStartDatePrecision: (
            jsonSchema as { properties?: { experience?: { items?: { properties?: unknown } } } }
          ).properties?.experience?.items,
        },
        hypothesisId: 'A',
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch (schemaErr) {
    fetch('http://127.0.0.1:7845/ingest/3b4333d1-9478-4155-a0c2-6acee25e28ec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7f082c' },
      body: JSON.stringify({
        sessionId: '7f082c',
        location: 'candidateProfiler.agent.ts:schema-check-error',
        message: 'schema introspection failed',
        data: { error: schemaErr instanceof Error ? schemaErr.message : 'unknown' },
        hypothesisId: 'A',
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  let result: Awaited<ReturnType<typeof structured.invoke>>;
  try {
    result = await structured.invoke([
    {
      role: 'system',
      content: `You extract structured resume data. Identify experience timeline, skills, projects, certifications, measurable achievements.
Use date format "MMM YYYY" (e.g. Jan 2022) when month is known; year-only if only year appears.
Set startDatePrecision/endDatePrecision: "month" if MMM YYYY, "year" if YYYY only, "unknown" if missing.
Extract projects and certifications when present. Mark achievements with source "cv".
Infer seniority from titles and years. Never invent employers, dates, or metrics.`,
    },
    {
      role: 'user',
      content: `Extract structured profile from this resume:\n\n${normalized.slice(0, 12000)}`,
    },
  ]);
  } catch (invokeErr) {
    // #region agent log
    fetch('http://127.0.0.1:7845/ingest/3b4333d1-9478-4155-a0c2-6acee25e28ec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7f082c' },
      body: JSON.stringify({
        sessionId: '7f082c',
        location: 'candidateProfiler.agent.ts:invoke-catch',
        message: 'structured invoke failed',
        data: {
          error: invokeErr instanceof Error ? invokeErr.message : String(invokeErr),
        },
        hypothesisId: 'B',
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw invokeErr;
  }

  // #region agent log
  fetch('http://127.0.0.1:7845/ingest/3b4333d1-9478-4155-a0c2-6acee25e28ec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7f082c' },
    body: JSON.stringify({
      sessionId: '7f082c',
      location: 'candidateProfiler.agent.ts:post-invoke',
      message: 'profileCandidate success',
      data: { experienceCount: result.experience?.length ?? 0 },
      hypothesisId: 'C',
      runId: 'post-fix',
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const pi = result.personalInfo;
  return {
    ...result,
    personalInfo: {
      fullName: pi.fullName ?? '',
      email: pi.email ?? '',
      phone: pi.phone ?? '',
      location: pi.location ?? '',
      linkedIn: pi.linkedIn ?? '',
      summary: pi.summary ?? '',
      portfolioUrl: pi.portfolioUrl ?? '',
    },
    experience: result.experience.map((e) => ({
      ...e,
      current: e.current ?? false,
      endDate: e.endDate ?? '',
      technologies: e.technologies ?? [],
      startDatePrecision: inferDatePrecision(e.startDate, e.startDatePrecision),
      endDatePrecision: inferDatePrecision(e.endDate ?? '', e.endDatePrecision),
    })),
    education: result.education.map((ed) => ({
      ...ed,
      field: ed.field ?? '',
      startDate: ed.startDate ?? '',
      endDate: ed.endDate ?? '',
      startDatePrecision: inferDatePrecision(ed.startDate ?? '', ed.startDatePrecision),
      endDatePrecision: inferDatePrecision(ed.endDate ?? '', ed.endDatePrecision),
    })),
    projects: (result.projects ?? []).map((p) => ({
      ...p,
      description: p.description ?? '',
      technologies: p.technologies ?? [],
      url: p.url ?? '',
      bullets: p.bullets ?? [],
    })),
    certifications: (result.certifications ?? []).map((c) => ({
      ...c,
      issuer: c.issuer ?? '',
      date: c.date ?? '',
      datePrecision: inferDatePrecision(c.date ?? '', c.datePrecision),
    })),
    achievements: result.achievements.map((a) => ({
      ...a,
      sourceId: a.sourceId ?? '',
      metrics: a.metrics ?? [],
      framework: a.framework ?? 'metric',
      employerId: a.employerId ?? '',
      dateRange: a.dateRange ?? '',
      sectionTarget: a.sectionTarget ?? 'experience',
    })),
    inferredSeniority: result.inferredSeniority ?? 'mid',
    rawText: normalized,
  };
}
