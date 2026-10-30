import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { readReport } from "../src/schema.js";

// Only validated stable scenario IDs/statuses go into Markdown, never imported prose.
let summary =
  "## Storage Doctor\n\nNo valid report was produced. Inspect the setup/check step; no storage conclusion is available.\n";
try {
  const report = await readReport(
    join(process.env.SD_ACTION_OUT, "report.json"),
  );
  summary = `## Storage Doctor\n\nEvidence: ${report.mode === "fixture" ? "protocol fixture (not vendor evidence)" : "local target"}. Diagnostic exit: ${report.exitCode}. Cleanup warnings: ${report.cleanupWarnings.length}.\n\n| Check | Status |\n| --- | --- |\n${report.results.map((r) => `| ${r.id} | ${r.status.toUpperCase()} |`).join("\n")}\n\nDownload the evidence artifact for expectations, traces and reproduction details. A failed check does not establish a target defect.\n`;
} catch {
  /* Setup failures still get a useful summary without raw errors. */
}
if (process.env.GITHUB_STEP_SUMMARY)
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
