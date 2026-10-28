import { mkdir, writeFile, readFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function markdown(r) {
  return (
    `# Storage Doctor\n\nMode: **${r.mode}** · Target: \`${r.config.targetVersion}\` · ${r.startedAt}\n\n` +
    `These observations describe this run, not universal compatibility or a confirmed upstream defect.\n\n` +
    `| Scenario | Status | Evidence |\n|---|---|---|\n` +
    r.results.map((x) => `| ${x.id} | ${x.status} | ${x.reason} |`).join("\n") +
    `\n\nCleanup warnings: ${r.cleanupWarnings.length}. Exit code: ${r.exitCode}.\n\nRequest durations are diagnostics, not controlled performance benchmarks.\n`
  );
}
export function html(r) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Storage Doctor report</title><style>
  :root{color-scheme:dark;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:#101817;color:#e5efeb}body{max-width:1000px;margin:60px auto;padding:0 24px}header{border-bottom:1px solid #345047;padding-bottom:24px}h1{font:600 40px system-ui;letter-spacing:-2px}small{color:#99b6aa}.tag{color:#79ecc0}summary{cursor:pointer;padding:20px 0;display:flex;gap:16px;align-items:center}details{border-bottom:1px solid #345047}.passed{color:#79ecc0}.failed{color:#ff958c}.inconclusive{color:#ffd58b}.unsupported,.skipped{color:#99b6aa}table{width:100%;text-align:left;font-size:13px;border-collapse:collapse}td,th{padding:10px;border-top:1px solid #263c33}p{line-height:1.65}.counts{display:flex;gap:24px;flex-wrap:wrap;margin:28px 0}.count{font-size:26px}.count small{display:block;font-size:12px}footer{margin:36px 0;color:#99b6aa}code{overflow-wrap:anywhere}</style>
  <header><span class="tag">STORAGE DOCTOR / EVIDENCE REPORT</span><h1>Trust the bytes.<br>Inspect the evidence.</h1><p>${escape(r.mode.toUpperCase())} · ${escape(r.config.profile)} · ${escape(r.config.targetVersion)}</p><small>${escape(r.startedAt)} · ${escape(r.runId)}</small></header>
  <div class="counts">${Object.entries(r.summary)
    .map(([k, v]) => `<div class="count ${k}">${v}<small>${k}</small></div>`)
    .join("")}</div>
  <p>Observations from one bounded run. A failed check needs reproduction and investigation before it becomes a bug claim.${r.mode === "fixture" ? " <strong>This is a protocol fixture, not a real storage engine.</strong>" : ""}</p>
  ${r.results.map((x) => `<details><summary><span class="${escape(x.status)}">${escape(x.status.toUpperCase())}</span><span>${escape(x.title)}</span></summary><p>${escape(x.reason)}</p><small>${escape(x.id)} · ${x.ms} ms</small><table><thead><tr><th>Protocol</th><th>Operation</th><th>HTTP</th><th>ms</th></tr></thead><tbody>${x.trace.map((t) => `<tr><td>${escape(t.protocol)}</td><td>${escape(t.operation)}</td><td>${escape(t.status ?? "unavailable")}</td><td>${t.ms}</td></tr>`).join("")}</tbody></table></details>`).join("")}
  <footer>Cleanup warnings: ${r.cleanupWarnings.length}. ${r.cleanupWarnings.map(escape).join(" ")}<p>Timing is diagnostic, not a performance benchmark. Credentials, response bodies and authorization headers are excluded by design. Review target identifiers before sharing.</p></footer></html>`;
}
export async function writeReport(report, directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const files = {
    "report.json": JSON.stringify(report, null, 2) + "\n",
    "report.md": markdown(report),
    "report.html": html(report),
  };
  for (const [name, body] of Object.entries(files))
    await writeFile(join(directory, name), body, { mode: 0o600 });
  const checksums = Object.fromEntries(
    Object.entries(files).map(([name, body]) => [
      name,
      createHash("sha256").update(body).digest("hex"),
    ]),
  );
  await writeFile(
    join(directory, "checksums.json"),
    JSON.stringify(checksums, null, 2) + "\n",
    { mode: 0o600 },
  );
}
export async function exportFinding(reportPath, id, directory) {
  const source = await readFile(reportPath, "utf8");
  const r = JSON.parse(source);
  if (r.schemaVersion !== 1 || !Array.isArray(r.results))
    throw new Error("Unsupported report format.");
  const finding = r.results.find((x) => x.id === id);
  if (!finding) throw new Error("Scenario is not in this report.");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await copyFile(reportPath, join(directory, "original-report.json"));
  const summary = Object.fromEntries(
    ["passed", "failed", "unsupported", "skipped", "inconclusive"].map((s) => [
      s,
      finding.status === s ? 1 : 0,
    ]),
  );
  await writeReport(
    {
      ...r,
      sourceRunId: r.runId,
      results: [finding],
      summary,
      exitCode:
        r.cleanupWarnings.length || finding.status === "inconclusive"
          ? 2
          : finding.status === "failed"
            ? 1
            : 0,
    },
    directory,
  );
  await writeFile(
    join(directory, "REPRODUCE.md"),
    `# Reproduce ${id}\n\nOriginal result: ${finding.status}. Mode: ${r.mode}.\n\n1. Install Storage Doctor 0.1.0 with Node 22+ and npm ci.\n2. Provision a dedicated local target at version ${r.config.targetVersion}.\n3. Configure credentials via environment variables, following examples/local.env.example. No credentials are included here.\n4. Set SD_SEED=${r.config.seed} and run:\n\n    node src/cli.js check --local --only ${id}\n\nUse the same profile, URLs, bucket and version recorded in report.json. Each run uses new object keys.\n\nThe bundle contains observations, not a standalone server or proof of root cause. Fixture-mode results must be repeated against a real engine.\n`,
    { mode: 0o600 },
  );
}
