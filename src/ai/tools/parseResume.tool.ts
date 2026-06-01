/**
 * Resume text normalization (file parsing stays in API route)
 */

export function normalizeResumeText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/([a-z])-\n([a-z])/gi, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function chunkResumeSections(text: string): Record<string, string> {
  const sections: Record<string, string> = { full: text };
  const headers = [
    'experience',
    'work experience',
    'employment',
    'education',
    'skills',
    'summary',
    'profile',
    'projects',
    'certifications',
  ];
  const lines = text.split('\n');
  let current = 'header';
  let buffer: string[] = [];

  for (const line of lines) {
    const lower = line.trim().toLowerCase();
    const matched = headers.find((h) => lower === h || lower.startsWith(h + ' '));
    if (matched && line.trim().length < 60) {
      if (buffer.length) sections[current] = buffer.join('\n').trim();
      current = matched.replace(/\s+/g, '_');
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (buffer.length) sections[current] = buffer.join('\n').trim();
  return sections;
}
