#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { loadConfig, publicConfig, ConfigurationError } from "./config.js";
import { scenarios } from "./scenarios.js";
import { run, packs } from "./runner.js";
import { writeReport, exportFinding, verifyBundle } from "./report.js";
import { readReport, ReportError } from "./schema.js";
import { VERSION } from "./version.js";

const usage = `Storage Doctor ${VERSION} — Trust the bytes. Inspect the evidence.

  storage-doctor doctor [--json]                Validate local configuration; no network
  storage-doctor list [--pack NAME] [--json]     Explain available diagnostics
  storage-doctor check --local [--pack NAME] [--only ID] [--out NEW_DIR]
  storage-doctor report --report FILE --out NEW_DIR
  storage-doctor export ID --report FILE --out NEW_DIR
  storage-doctor verify --report BUNDLE_DIR     Verify checksums and report schema
  storage-doctor plan --report FILE             Suggest one deterministic retest

Packs: all, core, s3, cross-protocol, tus. No plugin execution.
Output: --json (one JSON value), --quiet (errors only), --ci (noninteractive).
Credentials: SD_* environment variables; see examples/local.env.example.
Only literal loopback targets. Existing output directories are never overwritten.
Exit: 0 evaluated checks pass, 1 contract failure, 2 incomplete/harness/setup/cleanup error.
Core functionality needs no AI key. npm publication is not yet authorized.`;
class UsageError extends Error {}
let json = false;
async function main() {
  let args;
  try {
    args = parseArgs({
      allowPositionals: true,
      options: {
        local: { type: "boolean" },
        ci: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean" },
        json: { type: "boolean" },
        quiet: { type: "boolean" },
        out: { type: "string" },
        only: { type: "string" },
        pack: { type: "string" },
        report: { type: "string" },
      },
    });
  } catch {
    throw new UsageError(
      "Invalid arguments. Run storage-doctor --help for commands and flags.",
    );
  }
  const { values: v, positionals: p } = args;
  json = !!v.json;
  const emit = (value) => {
    if (json) console.log(JSON.stringify(value));
    else if (!v.quiet)
      console.log(
        typeof value === "string" ? value : JSON.stringify(value, null, 2),
      );
  };
  if (v.version) {
    emit({ version: VERSION });
    return;
  }
  if (v.help || !p.length) {
    emit(usage);
    return;
  }
  const [command, id] = p;
  const options = {
    doctor: ["json", "quiet"],
    list: ["json", "quiet", "pack"],
    check: ["local", "ci", "json", "quiet", "out", "only", "pack"],
    report: ["report", "out", "json", "quiet"],
    export: ["report", "out", "json", "quiet"],
    verify: ["report", "json", "quiet"],
    plan: ["report", "json", "quiet"],
  };
  if (
    !Object.hasOwn(options, command) ||
    p.length > (command === "export" ? 2 : 1) ||
    Object.keys(v).some((k) => !options[command].includes(k))
  )
    throw new UsageError(
      "Unknown command, extra argument or misplaced flag. Run storage-doctor --help.",
    );
  if (command === "doctor") {
    const c = loadConfig();
    emit({
      valid: true,
      networkContacted: false,
      configuration: publicConfig(c),
      message:
        "Configuration is valid. This does not verify credentials or target availability. Checks create and delete only run-owned test objects.",
    });
    return;
  }
  if (command === "list") {
    if (v.pack && !Object.hasOwn(packs, v.pack))
      throw new UsageError(
        "Unknown pack. Choose all, core, s3, cross-protocol or tus.",
      );
    const list = scenarios
      .filter((s) => !v.pack || packs[v.pack].includes(s.id))
      .map(({ run, ...s }) => s);
    emit(
      json
        ? list
        : list
            .map(
              (s) =>
                `${s.id.padEnd(22)} ${s.protocols.join("+").padEnd(14)} ${s.title}`,
            )
            .join("\n"),
    );
    return;
  }
  if (command === "check") {
    if (!v.local)
      throw new UsageError(
        "Supply --local to confirm a disposable local target. Run doctor to check configuration first.",
      );
    const config = loadConfig(),
      controller = new AbortController(),
      cancel = () => controller.abort();
    process.once("SIGINT", cancel);
    process.once("SIGTERM", cancel);
    let report;
    try {
      report = await run(config, {
        only: v.only,
        pack: v.pack,
        signal: controller.signal,
      });
    } finally {
      process.removeListener("SIGINT", cancel);
      process.removeListener("SIGTERM", cancel);
    }
    const directory = resolve(v.out || `reports/${report.runId}`);
    await writeReport(report, directory);
    emit(
      json
        ? { ...report, reportDirectory: directory }
        : report.results
            .map(
              (r) =>
                `${({ passed: "PASS", failed: "FAIL" }[r.status] || r.status.toUpperCase()).padEnd(13)} ${r.id}\n  ${r.reason}`,
            )
            .join("\n") +
            `\n\nCleanup warnings: ${report.cleanupWarnings.length}\nEvidence: ${directory}\nExit: ${report.exitCode}`,
    );
    process.exitCode = report.exitCode;
    return;
  }
  if (!v.report)
    throw new UsageError(
      "Supply --report with an existing report file or a bundle directory for verify.",
    );
  if (command === "verify") {
    emit(await verifyBundle(resolve(v.report)));
    return;
  }
  if (command === "report") {
    if (!v.out) throw new UsageError("Choose a new --out directory.");
    await writeReport(await readReport(resolve(v.report)), resolve(v.out));
    emit({ reportDirectory: resolve(v.out) });
    return;
  }
  if (command === "export") {
    if (!scenarios.some((s) => s.id === id))
      throw new UsageError("Choose a diagnostic ID from list.");
    const directory = resolve(v.out || `reports/export-${id}-${Date.now()}`);
    await exportFinding(resolve(v.report), id, directory);
    emit({ bundleDirectory: directory });
    return;
  }
  if (command === "plan") {
    const r = await readReport(resolve(v.report)),
      rank = { error: 0, failed: 1, inconclusive: 2, skipped: 3, passed: 4 };
    const next = r.results
      .filter((r) => r.status !== "unsupported")
      .sort((a, b) => rank[a.status] - rank[b.status])[0];
    emit({
      strategy: "deterministic-retest-v1",
      basis: r.runId,
      next: next?.id || null,
      reason:
        "Retest anomalies first; otherwise repeat a baseline. No demonstrated self-improvement.",
      budget: { maxScenarios: 1 },
      command: next ? `storage-doctor check --local --only ${next.id}` : null,
    });
    return;
  }
}
main().catch((error) => {
  const message =
    error instanceof UsageError ||
    error instanceof ReportError ||
    error instanceof ConfigurationError
      ? error.message
      : "Configuration or execution failed. Run doctor and check docs/configuration.md; raw error details are suppressed to protect credentials.";
  if (json) console.log(JSON.stringify({ error: message, exitCode: 2 }));
  else console.error(`Storage Doctor: ${message}`);
  process.exitCode = 2;
});
