#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { loadConfig } from "./config.js";
import { scenarios } from "./scenarios.js";
import { run } from "./runner.js";
import { writeReport, exportFinding } from "./report.js";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      local: { type: "boolean" },
      ci: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      out: { type: "string" },
      only: { type: "string" },
      report: { type: "string" },
    },
  });
  const [command, id] = positionals;
  if (values.help || !command) {
    console.log(
      `Storage Doctor 0.1.0 — local storage evidence\n\n  storage-doctor list\n  storage-doctor check --local [--only ID] [--out DIRECTORY] [--ci]\n  storage-doctor export ID --report PATH [--out DIRECTORY]\n  storage-doctor plan --report PATH\n\nCredentials: environment variables only; see examples/local.env.example.\nExit: 0 evaluated checks pass, 1 failed assertion/operation, 2 incomplete/configuration/cleanup error.\nNot published to npm yet; run node src/cli.js from this checkout.`,
    );
    return;
  }
  if (command === "list") {
    for (const s of scenarios)
      console.log(
        `${s.id.padEnd(22)} ${s.protocols.join("+").padEnd(14)} ${s.title}`,
      );
    return;
  }
  if (command === "check") {
    if (!values.local)
      throw new Error(
        "This release requires --local and only accepts literal loopback targets.",
      );
    const report = await run(loadConfig(), { only: values.only });
    const directory = resolve(values.out || `reports/${report.runId}`);
    await writeReport(report, directory);
    for (const r of report.results)
      console.log(`${r.status.toUpperCase().padEnd(13)} ${r.id}`);
    console.log(
      `\nEvidence: ${directory}\nCleanup warnings: ${report.cleanupWarnings.length}`,
    );
    if (values.ci)
      console.log(
        JSON.stringify({
          schemaVersion: 1,
          summary: report.summary,
          exitCode: report.exitCode,
        }),
      );
    process.exitCode = report.exitCode;
    return;
  }
  if (command === "export") {
    if (!values.report || !scenarios.some((s) => s.id === id))
      throw new Error("Provide a valid scenario ID and --report report.json.");
    const directory = resolve(values.out || `reports/export-${id}`);
    await exportFinding(resolve(values.report), id, directory);
    console.log(`Evidence bundle: ${directory}`);
    return;
  }
  if (command === "plan") {
    if (!values.report) throw new Error("Provide --report report.json.");
    const report = JSON.parse(await readFile(values.report, "utf8"));
    if (report.schemaVersion !== 1 || !Array.isArray(report.results))
      throw new Error("Unsupported report format.");
    const rank = {
      failed: 0,
      inconclusive: 1,
      skipped: 2,
      passed: 3,
      unsupported: 4,
    };
    const candidates = report.results
      .filter(
        (r) =>
          r.status !== "unsupported" &&
          Object.hasOwn(rank, r.status) &&
          scenarios.some((s) => s.id === r.id),
      )
      .sort((a, b) => rank[a.status] - rank[b.status]);
    const next = candidates[0];
    console.log(
      JSON.stringify(
        {
          strategy: "deterministic-retest-v1",
          basis: report.runId,
          next: next?.id || null,
          reason: next
            ? "Reproduce an anomaly first; otherwise repeat a baseline. This is a scheduling heuristic, not demonstrated self-improvement."
            : "No applicable scenarios.",
          budget: { maxScenarios: 1, maxRequestTimeoutMs: 30000 },
          command: next
            ? `node src/cli.js check --local --only ${next.id}`
            : null,
        },
        null,
        2,
      ),
    );
    return;
  }
  throw new Error("Unknown command. Use --help.");
}
main().catch((error) => {
  console.error(`Storage Doctor: ${error.message}`);
  process.exitCode = 2;
});
