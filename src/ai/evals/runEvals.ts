/**
 * Evaluation harness — run via: npx tsx src/ai/evals/runEvals.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { analyzeRole } from '@/src/ai/agents/jobAnalyzer.agent';
import { profileCandidate } from '@/src/ai/agents/candidateProfiler.agent';
import { scoreMatch } from '@/src/ai/agents/scoringEngine.agent';
import { configureLangSmith } from '@/src/ai/observability/langsmith.config';

configureLangSmith();

interface GoldenPair {
  id: string;
  jobDescription: string;
  cvSnippet: string;
  expectedMinScore?: number;
  expectedMaxScore?: number;
  expectedRouting?: string;
}

async function main() {
  const pairs: GoldenPair[] = JSON.parse(
    readFileSync(join(__dirname, 'golden-pairs.json'), 'utf-8')
  );

  let passed = 0;
  for (const pair of pairs) {
    console.log(`\nEval: ${pair.id}`);
    const role = await analyzeRole(pair.jobDescription);
    const candidate = await profileCandidate(pair.cvSnippet);
    const report = await scoreMatch(role, candidate, pair.jobDescription, pair.cvSnippet);

    let ok = true;
    if (pair.expectedMinScore != null && report.overallFit < pair.expectedMinScore) ok = false;
    if (pair.expectedMaxScore != null && report.overallFit > pair.expectedMaxScore) ok = false;
    if (pair.expectedRouting && report.routingRecommendation !== pair.expectedRouting) ok = false;

    console.log(`  Score: ${report.overallFit}, Route: ${report.routingRecommendation}, OK: ${ok}`);
    if (ok) passed++;
  }

  console.log(`\n${passed}/${pairs.length} passed`);
  process.exit(passed === pairs.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
