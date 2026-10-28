import { config } from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createAiEngine } from "@/ai/engine";
import { parseArgs } from "./lib/args";
import { baselineSchema, compareToBaseline, toBaseline } from "./lib/baseline";
import { loadCases, pickSample } from "./lib/cases";
import { runAll } from "./lib/runner";
import { summarize } from "./lib/scoring";

config({ path: ".env.local" });

const CASES_PATH = path.resolve(import.meta.dirname, "cases/lesson-plan.json");
const BASELINE_PATH = path.resolve(import.meta.dirname, "baseline.json");

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.OPENAI_API_KEY) throw new Error("Eval cần OPENAI_API_KEY (trong .env.local hoặc biến môi trường)");

  const all = loadCases(CASES_PATH);
  const cases = args.sample ? pickSample(all, args.sample) : all;
  console.log(`Chạy ${cases.length}/${all.length} case…`);

  const results = await runAll(createAiEngine(), cases);
  const errors = results.flatMap((r) => (r.ok ? [] : [r]));
  const summary = summarize(results.flatMap((r) => (r.ok ? [r.score] : [])));

  for (const c of summary.cases) console.log(`${c.id}  ${c.score.toFixed(3)}  blocking=${c.blockingFailures}${c.failed.length ? `  chưa đạt: ${c.failed.join(", ")}` : ""}`);
  errors.forEach((e) => console.error(`${e.id}  LỖI: ${e.error}`));
  console.log(`Điểm trung bình ${summary.overall.toFixed(3)} · vi phạm bắt buộc ${summary.blockingFailures}`);

  // Có case lỗi hạ tầng thì điểm không đáng tin: không so sánh, không ghi baseline.
  if (errors.length) return 1;

  if (args.updateBaseline) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(toBaseline(summary), null, 2)}\n`);
    console.log(`Đã ghi baseline: ${BASELINE_PATH}`);
    return 0;
  }

  if (!existsSync(BASELINE_PATH)) throw new Error("Chưa có evals/baseline.json — chạy `npm run eval:baseline` trước");
  const comparison = compareToBaseline(summary, baselineSchema.parse(JSON.parse(readFileSync(BASELINE_PATH, "utf8"))), args.threshold);
  console.log(`So với baseline: ${comparison.baselineOverall.toFixed(3)} → ${comparison.overall.toFixed(3)}`);
  comparison.reasons.forEach((reason) => console.error(`FAIL: ${reason}`));
  return comparison.passed ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
