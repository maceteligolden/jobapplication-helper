import type { CvSectionOutput } from '@/src/ai/schemas/generation.schema';
import type { CvSectionPlanItem } from '@/src/ai/schemas/jobTypeProfile.schema';

export function renderCvFromSections(
  sections: CvSectionOutput[],
  sectionPlan?: CvSectionPlanItem[]
): string {
  if (!sections.length) return '';

  const order = sectionPlan?.map((s) => s.id) ?? sections.map((s) => s.id);
  const byId = new Map(sections.map((s) => [s.id, s]));
  const ordered: CvSectionOutput[] = [];

  for (const id of order) {
    const sec = byId.get(id);
    if (sec?.content?.trim()) ordered.push(sec);
  }
  for (const sec of sections) {
    if (!ordered.includes(sec) && sec.content?.trim()) ordered.push(sec);
  }

  return ordered
    .map((s) => `${s.title.toUpperCase()}\n${s.content.trim()}`)
    .join('\n\n');
}
