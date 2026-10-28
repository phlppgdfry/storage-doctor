import { mkdir, writeFile, readFile, open } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { constants } from "node:fs";
import { validateReport, readReport, ReportError } from "./schema.js";
import { summarize } from "./runner.js";
import { createHash } from "node:crypto";

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const md = (value) =>
  escape(value)
    .replace(/\|/g, "&#124;")
    .replace(/`/g, "&#96;")
    .replace(/[\r\n]/g, " ");
export function markdown(r) {
  r = validateReport(r);
  return (
    `# Storage Doctor\n\nMode: **${r.mode}** · Target: \`${md(r.config.targetVersion)}\` · ${r.startedAt}\n\n` +
    `These observations describe this run, not universal compatibility or a confirmed upstream defect.\n\n` +
    `| Scenario | Status | Evidence |\n|---|---|---|\n` +
    r.results
      .map((x) => `| ${x.id} | ${x.status} | ${md(x.reason)} |`)
      .join("\n") +
    `\n\nCleanup warnings: ${r.cleanupWarnings.length}. Exit code: ${r.exitCode}.\n\nRequest durations are diagnostics, not controlled performance benchmarks.\n`
  );
}
export function html(r) {
  r = validateReport(r);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Storage Doctor report</title><style>
  :root{color-scheme:dark;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:#101817;color:#e5efeb}body{max-width:1000px;margin:60px auto;padding:0 24px}header{border-bottom:1px solid #345047;padding-bottom:24px}h1{font:600 clamp(26px,5vw,40px) system-ui;letter-spacing:-2px}small{color:#99b6aa}.tag{color:#79ecc0}summary:focus-visible{outline:3px solid #79ecc0;outline-offset:4px} .error{color:#ff958c} .table-wrap{overflow:auto} summary{cursor:pointer;padding:20px 0;display:flex;gap:16px;align-items:center}details{border-bottom:1px solid #345047}.passed{color:#79ecc0}.failed{color:#ff958c}.inconclusive{color:#ffd58b}.unsupported,.skipped{color:#99b6aa}table{width:100%;text-align:left;font-size:13px;border-collapse:collapse}td,th{padding:10px;border-top:1px solid #263c33}p{line-height:1.65}.counts{display:flex;gap:24px;flex-wrap:wrap;margin:28px 0}.count{font-size:26px}.count small{display:block;font-size:12px}footer{margin:36px 0;color:#99b6aa}code{overflow-wrap:anywhere}</style></head><body><main>
  <header><span class="tag">STORAGE DOCTOR / EVIDENCE REPORT</span><h1>Trust the bytes.<br>Inspect the evidence.</h1><p>${escape(r.mode.toUpperCase())} · ${escape(r.config.profile)} · ${escape(r.config.targetVersion)}</p><small>${escape(r.startedAt)} · ${escape(r.runId)}</small></header>
  <div class="counts">${Object.entries(r.summary)
    .map(
      ([k, v]) =>
        `<div class="count ${escape(k)}">${escape(v)}<small>${escape(k)}</small></div>`,
    )
    .join("")}</div>
  <section aria-label="Environment"><h2>Environment</h2><p>Node ${escape(r.nodeVersion)} · ${escape(r.platform)} · tool ${escape(r.toolVersion)} · schema ${r.schemaVersion}</p><p>Profile: ${escape(r.config.profile)} · region: ${escape(r.config.region)} · seed: ${escape(r.config.seed)}</p><p><code>${escape(r.config.s3Url)}</code></p></section>
  <h2>Diagnostic results</h2><p>Observations from one bounded run. A failed check needs reproduction and investigation before it becomes a bug claim.${r.mode === "fixture" ? " <strong>This is a protocol fixture, not a real storage engine.</strong>" : ""}</p>
  ${r.results.map((x) => `<details><summary><span class="${escape(x.status)}">${escape(x.status.toUpperCase())}</span><span>${escape(x.title)}</span></summary><p><strong>Expected:</strong> ${escape(x.expected)}</p><p><strong>Observed:</strong> ${escape(x.reason)}</p><p>Cleanup: ${escape(x.cleanup.status)}. ${x.cleanup.warnings.map(escape).join(" ")}</p><p><a href="${escape(x.reference)}" rel="noreferrer">Protocol contract</a></p><p>Replay: <code>storage-doctor check --local --only ${escape(x.id)}</code> with the recorded profile, region, seed and disposable target.</p><small>${escape(x.id)} · ${escape(x.ms)} ms</small><div class="table-wrap"><table><thead><tr><th>Protocol</th><th>Operation</th><th>HTTP</th><th>ms</th></tr></thead><tbody>${x.trace.map((t) => `<tr><td>${escape(t.protocol)}</td><td>${escape(t.operation)}</td><td>${escape(t.status ?? "unavailable")}</td><td>${escape(t.ms)}</td></tr>`).join("")}</tbody></table></div></details>`).join("")}
  <footer>Cleanup warnings: ${r.cleanupWarnings.length}. ${r.cleanupWarnings.map(escape).join(" ")}<p>Timing is diagnostic, not a performance benchmark. Credentials, response bodies and authorization headers are excluded by design. Review target identifiers before sharing.</p></footer></main></body></html>`;
}
async function writeFiles(files, directory) {
  await mkdir(dirname(directory), { recursive: true, mode: 0o700 });
  try {
    await mkdir(directory, { mode: 0o700 });
  } catch {
    throw new ReportError(
      "Output directory already exists or cannot be created. Choose a new --out path.",
    );
  }
  for (const [name, body] of Object.entries(files))
    await writeFile(join(directory, name), body, { mode: 0o600, flag: "wx" });
  const checksums = Object.fromEntries(
    Object.entries(files).map(([name, body]) => [
      name,
      createHash("sha256").update(body).digest("hex"),
    ]),
  );
  await writeFile(
    join(directory, "checksums.json"),
    JSON.stringify(checksums, null, 2) + "\n",
    { mode: 0o600, flag: "wx" },
  );
}
function reportFiles(report) {
  const r = validateReport(report);
  return {
    "report.json": JSON.stringify(r, null, 2) + "\n",
    "report.md": markdown(r),
    "report.html": html(r),
  };
}
export async function writeReport(report, directory) {
  await writeFiles(reportFiles(report), directory);
}
export async function exportFinding(reportPath, id, directory) {
  const r = await readReport(reportPath),
    finding = r.results.find((x) => x.id === id);
  if (!finding)
    throw new ReportError("Scenario is not present in this report.");
  const focused = {
    ...r,
    sourceRunId: r.runId,
    results: [finding],
    ...summarize([finding], r.cleanupWarnings),
  };
  const files = reportFiles(focused);
  files["original-report.json"] = JSON.stringify(r, null, 2) + "\n";
  files["REPRODUCE.md"] =
    `# Reproduce ${id}\n\nObservation: ${finding.status}. Mode: ${r.mode}. Tool: ${r.toolVersion}.\n\nExpected: ${finding.expected}\n\nObserved: ${finding.reason}\n\n1. Install the matching Storage Doctor checkout/tag with Node 22+ and npm ci.\n2. Provision a disposable local engine at version ${md(r.config.targetVersion)}. Create a new dedicated private sd-* bucket.\n3. Configure credentials via environment variables. Use profile ${r.config.profile}, region ${r.config.region}, the local endpoint paths in report.json and SD_SEED=${r.config.seed}. Set SD_BUCKET to the newly created bucket.\n4. Run:\n\n    storage-doctor check --local --only ${id}\n\nOr from the source checkout: node src/cli.js check --local --only ${id}.\n\nThe original-report.json is schema-validated and normalized; it is not a verbatim copy of untrusted input. Every bundle file is included in checksums.json. Verify with storage-doctor verify --report PATH_TO_BUNDLE_DIRECTORY.\n\nThis recipe requires a separately provisioned engine and credentials. It is not a standalone server, proof of root cause or proof of independent reproduction. Fixture findings must be repeated against a real engine.\n`;
  await writeFiles(files, directory);
}
export async function verifyBundle(directory) {
  let manifest;
  try {
    const handle = await open(
      join(directory, "checksums.json"),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      if ((await handle.stat()).size > 4096) throw new Error();
      manifest = JSON.parse(await handle.readFile("utf8"));
    } finally {
      await handle.close();
    }
  } catch {
    throw new ReportError("Cannot read integrity manifest.");
  }
  if (
    !manifest ||
    typeof manifest !== "object" ||
    Array.isArray(manifest) ||
    Object.keys(manifest).length > 10 ||
    !["report.json", "report.md", "report.html"].every((k) =>
      Object.hasOwn(manifest, k),
    )
  )
    throw new ReportError("Invalid integrity manifest.");
  for (const [name, hash] of Object.entries(manifest)) {
    if (
      basename(name) !== name ||
      ![
        "report.json",
        "report.md",
        "report.html",
        "original-report.json",
        "REPRODUCE.md",
      ].includes(name) ||
      !/^[a-f0-9]{64}$/.test(hash)
    )
      throw new ReportError("Invalid integrity manifest entry.");
    const handle = await open(
      join(directory, name),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > 2097152)
        throw new ReportError("Bundle file exceeds limits.");
      if (
        createHash("sha256")
          .update(await handle.readFile())
          .digest("hex") !== hash
      )
        throw new ReportError("Bundle integrity verification failed.");
    } finally {
      await handle.close();
    }
  }
  await readReport(join(directory, "report.json"));
  return {
    verified: true,
    files: Object.keys(manifest).length,
    authentication: "Checksums verify integrity, not authorship.",
  };
}
