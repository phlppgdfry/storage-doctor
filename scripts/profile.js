import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { readReport } from "../src/schema.js";
import { html } from "../src/report.js";
const samples = [];
for (let i = 0; i < 5; i++) {
  const start = performance.now();
  execFileSync(process.execPath, ["src/cli.js", "--help"], { stdio: "ignore" });
  samples.push(Math.round(performance.now() - start));
}
const report = await readReport("examples/verified-supabase/report.json"),
  render = [];
for (let i = 0; i < 5; i++) {
  const start = performance.now();
  html(report);
  render.push(Number((performance.now() - start).toFixed(3)));
}
console.log(
  JSON.stringify(
    {
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      sampleSize: 5,
      coldHelpWallMs: samples,
      reportRenderMs: render,
      parentMemoryBytes: process.memoryUsage(),
      limitations:
        "Local sequential samples including process startup. Parent memory is not child peak RSS. No vendor performance claim; no statistically demonstrated optimization.",
    },
    null,
    2,
  ),
);
