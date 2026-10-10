import { existsSync, writeFileSync } from "node:fs";
import cases from "../evals/cases.json";
import { seedWorkspace } from "../lib/seed";
import { retrieve, fuseRetrieval } from "../lib/retrieval";
import { expandQuery, generateAnswer } from "../lib/ai";
async function main() {
  for (const file of [".env.local", ".env"])
    if (existsSync(file)) process.loadEnvFile(file);
  const live = process.argv.includes("--live");
  if (live && (!process.env.OPENAI_API_KEY || !process.env.AI_MODEL))
    throw new Error(
      "Live evaluation requires OPENAI_API_KEY and AI_MODEL. It sends only fictional fixture content and incurs API usage.",
    );
  const articles = seedWorkspace().articles;
  const results = [];
  for (const item of cases) {
    let sources = retrieve(item.question, articles);
    let answer: unknown;
    let error: string | undefined;
    try {
      if (live) {
        const expansions = await expandQuery(item.question);
        sources = fuseRetrieval(item.question, expansions, articles);
        answer = await generateAnswer(item.question, sources);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Evaluation failed";
    }
    const passed =
      !error &&
      (item.expected
        ? sources.some((a) => a.id === item.expected)
        : sources.length === 0);
    results.push({
      ...item,
      sourceIds: sources.map((a) => a.id),
      passed,
      answer,
      error,
    });
  }
  const report = {
    mode: live ? "live-model" : "offline-retrieval",
    model: live ? process.env.AI_MODEL : null,
    date: new Date().toISOString(),
    passed: results.filter((r) => r.passed).length,
    total: results.length,
    requiresHumanReview: live,
    results,
  };
  writeFileSync(
    live ? "evals/live-report.json" : "evals/offline-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    `${report.passed}/${report.total} ${report.mode} checks passed. ${live ? "Review answer correctness and refusals manually before setting AI_EVALUATION_APPROVED=true." : "No model API was called."}`,
  );
  if (report.passed !== report.total) process.exitCode = 1;
}
void main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
