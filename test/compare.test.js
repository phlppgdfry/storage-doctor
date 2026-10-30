import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  writeFile,
  readFile,
  rm,
  unlink,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { startFixture, fixtureEnv } from "./fixture.js";
import { loadConfig } from "../src/config.js";
import { run, summarize } from "../src/runner.js";
import { writeReport } from "../src/report.js";
import { compareReports } from "../src/compare.js";
const execute = promisify(execFile);

async function evidence(corrupt = false, denied = false, only = "rest-to-s3") {
  const fixture = await startFixture({ corrupt, denied });
  try {
    return await run(loadConfig(fixtureEnv(fixture.base)), {
      only,
      mode: "fixture",
    });
  } finally {
    await fixture.close();
  }
}

test("comparison detects independently executed corruption and ignores ephemeral endpoint identity", async () => {
  const before = await evidence();
  const after = await evidence(true);
  assert.equal(before.exitCode, 0);
  assert.equal(after.exitCode, 1);
  const comparison = compareReports(before, after);
  assert.equal(comparison.exitCode, 1);
  assert.deepEqual(comparison.regressions, [
    { id: "rest-to-s3", before: "passed", after: "failed" },
  ]);
  assert.equal(compareReports(before, await evidence()).exitCode, 0);
});

test("comparison never turns missing, unauthorized or incompatible evidence green", async () => {
  const before = await evidence();
  assert.equal(
    compareReports(before, await evidence(false, true)).outcome,
    "incomplete",
  );
  const variations = [
    (r) => {
      r.results[0].id = "rest-overwrite-s3";
      r.results[0].reproduction.scenario = "rest-overwrite-s3";
    },
    (r) => {
      r.mode = "live";
    },
    (r) => {
      r.toolVersion = "0.9.0";
    },
    (r) => {
      delete r.sourceFingerprint;
    },
    (r) => {
      r.sourceFingerprint = "f".repeat(64);
    },
    (r) => {
      r.config.seed = "other";
      r.results[0].reproduction.seed = "other";
    },
    (r) => {
      r.config.region = "other";
    },
    (r) => {
      r.config.timeoutMs++;
    },
    (r) => {
      r.payloadSha256 = "f".repeat(64);
    },
    (r) => {
      delete r.environmentFingerprint;
      for (const result of r.results) delete result.environmentFingerprint;
    },
    (r) => {
      delete r.budget;
    },
    (r) => {
      r.budget.maxRequests++;
    },
    (r) => {
      r.results[0].status = "unsupported";
      Object.assign(r, summarize(r.results, r.cleanupWarnings));
    },
  ];
  for (const vary of variations) {
    const after = structuredClone(before);
    vary(after);
    assert.equal(compareReports(before, after).exitCode, 2);
  }
  assert.equal(
    compareReports(await evidence(true), before).outcome,
    "not-comparable",
  );
  const complete = await evidence(false, false, null);
  const partial = structuredClone(complete);
  partial.results[0].status = "failed";
  partial.results[1].status = "skipped";
  Object.assign(partial, summarize(partial.results, partial.cleanupWarnings));
  const mixed = compareReports(complete, partial);
  assert.equal(mixed.exitCode, 2);
  assert.equal(mixed.outcome, "incomplete");
  assert.equal(mixed.regressions.length, 1);
  const cleanup = structuredClone(before);
  cleanup.results[0].cleanup.status = "failed";
  cleanup.results[0].cleanup.warnings = ["Cleanup unavailable"];
  cleanup.cleanupWarnings = ["Cleanup unavailable"];
  Object.assign(cleanup, summarize(cleanup.results, cleanup.cleanupWarnings));
  assert.equal(compareReports(before, cleanup).exitCode, 2);
});

test("comparison allows declared target upgrades and ignores timings but validates imported evidence", async () => {
  const before = await evidence();
  const after = structuredClone(before);
  after.budget = Object.fromEntries(Object.entries(after.budget).reverse());
  after.config.targetVersion = "candidate-target-v2";
  after.results[0].ms += 100;
  after.results[0].trace[0].ms += 100;
  assert.equal(compareReports(before, after).exitCode, 0);
  after.summary.passed = 9;
  assert.throws(() => compareReports(before, after));
});

test("CLI fixture demo and comparison work without SD credentials; exit codes and JSON remain predictable", async () => {
  const directory = await mkdtemp(join(tmpdir(), "storage-doctor-compare-"));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("SD_")),
  );
  const cli = (...args) =>
    execute(process.execPath, ["src/cli.js", ...args], { env });
  try {
    const before = JSON.parse(
      (await cli("demo", "--out", join(directory, "before"), "--json")).stdout,
    );
    assert.equal(before.mode, "fixture");
    assert.equal(before.summary.passed, 10);
    const failed = await cli(
      "demo",
      "--inject-corruption",
      "--out",
      join(directory, "after"),
      "--json",
    ).catch((e) => e);
    assert.equal(failed.code, 1);
    assert.ok(JSON.parse(failed.stdout).summary.failed > 0);
    const args = [
      "compare",
      "--baseline",
      join(directory, "before/report.json"),
      "--report",
      join(directory, "after/report.json"),
      "--json",
    ];
    const regression = await cli(...args).catch((e) => e);
    assert.equal(regression.code, 1);
    assert.equal(JSON.parse(regression.stdout).outcome, "regression");
    const usage = await cli(
      "check",
      "--local",
      "--pack",
      "typo",
      "--json",
    ).catch((e) => e);
    assert.equal(usage.code, 2);
    assert.match(JSON.parse(usage.stdout).error, /Unknown pack/);
    const parse = await cli("--unknown", "--json").catch((e) => e);
    assert.equal(parse.code, 2);
    assert.match(JSON.parse(parse.stdout).error, /Invalid arguments/);
    const invalid = join(directory, "invalid.json");
    await writeFile(invalid, '{"secret":"never print imported payload"}');
    const error = await cli(
      "compare",
      "--baseline",
      invalid,
      "--report",
      invalid,
      "--json",
    ).catch((e) => e);
    assert.equal(error.code, 2);
    assert.ok(!error.stdout.includes("never print"));
    const quiet = await cli(
      "compare",
      "--baseline",
      join(directory, "before/report.json"),
      "--report",
      join(directory, "before/report.json"),
      "--quiet",
    );
    assert.equal(quiet.stdout, "");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("comparison explicitly handles status transitions, schema provenance and declared auth capability changes", async () => {
  const before = await evidence();
  for (const [status, expected] of [
    ["passed", 0],
    ["failed", 1],
    ["inconclusive", 2],
    ["unsupported", 2],
    ["skipped", 2],
    ["error", 2],
  ]) {
    const after = structuredClone(before);
    after.results[0].status = status;
    Object.assign(after, summarize(after.results, after.cleanupWarnings));
    assert.equal(
      compareReports(before, after).exitCode,
      expected,
      `PASS -> ${status}`,
    );
    if (status === "failed")
      assert.equal(
        compareReports(after, before).exitCode,
        2,
        "FAIL -> PASS cannot establish a healthy baseline",
      );
  }
  const legacy = structuredClone(before);
  legacy.schemaVersion = 1;
  assert.equal(compareReports(legacy, before).exitCode, 2);
  assert.throws(() => compareReports({ ...before, schemaVersion: 99 }, before));
  // Unit metadata cases only: these fixture observations are never exported as live evidence.
  const live = structuredClone(before);
  live.mode = "live";
  assert.equal(compareReports(live, live).exitCode, 0);
  const missing = structuredClone(live);
  delete missing.config.authContext;
  assert.equal(compareReports(missing, missing).exitCode, 2);
  const changed = structuredClone(live);
  changed.config.authContext = "end-user-rls-policy-v2";
  assert.equal(compareReports(live, changed).exitCode, 2);
  const unrecorded = structuredClone(live);
  unrecorded.config.authContext = "unrecorded";
  assert.equal(compareReports(unrecorded, unrecorded).exitCode, 2);
  assert.throws(() =>
    loadConfig({
      ...fixtureEnv("http://127.0.0.1:5000"),
      SD_AUTH_CONTEXT: "sb_secret_do_not_export",
    }),
  );
});

test("CLI comparison verifies complete bundles and rejects tampering, missing manifests and report symlinks", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sd-compare-integrity-"));
  const before = await evidence();
  const path = join(directory, "bundle");
  const cli = () =>
    execute(process.execPath, [
      "src/cli.js",
      "compare",
      "--baseline",
      join(path, "report.json"),
      "--report",
      join(path, "report.json"),
      "--json",
    ]);
  const rejects = async () => {
    const result = await cli().catch((e) => e);
    assert.equal(result.code, 2);
    assert.ok(!result.stdout.includes("do-not-leak"));
    JSON.parse(result.stdout);
  };
  try {
    await writeReport(before, path);
    assert.equal(JSON.parse((await cli()).stdout).outcome, "no-regression");
    const original = await readFile(join(path, "report.json"));
    // Well-formed, schema-valid edits must fail integrity, too.
    const tampered = JSON.parse(original);
    tampered.config.targetVersion = "do-not-leak";
    await writeFile(join(path, "report.json"), JSON.stringify(tampered));
    await rejects();
    await writeFile(join(path, "report.json"), original);
    const html = await readFile(join(path, "report.html"));
    await writeFile(join(path, "report.html"), "do-not-leak");
    await rejects();
    await writeFile(join(path, "report.html"), html);
    await unlink(join(path, "checksums.json"));
    await rejects();
    await unlink(join(path, "report.json"));
    await writeFile(join(directory, "external.json"), original);
    await symlink(join(directory, "external.json"), join(path, "report.json"));
    await rejects();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("comparison rejects incomplete/conflicting metadata and handles scenario set order by stable identity", async () => {
  const complete = await evidence(false, false, null);
  const reordered = structuredClone(complete);
  reordered.results.reverse();
  assert.equal(compareReports(complete, reordered).exitCode, 0);
  const partial = structuredClone(complete);
  partial.results.pop();
  Object.assign(partial, summarize(partial.results, partial.cleanupWarnings));
  assert.equal(
    compareReports(complete, partial).exitCode,
    2,
    "missing candidate scenario",
  );
  assert.equal(
    compareReports(partial, complete).exitCode,
    2,
    "extra candidate scenario",
  );
  const failed = structuredClone(complete);
  failed.results[0].status = "failed";
  Object.assign(failed, summarize(failed.results, failed.cleanupWarnings));
  const unavailable = structuredClone(complete);
  unavailable.results[0].status = "inconclusive";
  Object.assign(
    unavailable,
    summarize(unavailable.results, unavailable.cleanupWarnings),
  );
  assert.equal(
    compareReports(failed, unavailable).exitCode,
    2,
    "FAIL -> INCONCLUSIVE",
  );
  const invalid = [
    (r) => {
      r.results.push(structuredClone(r.results[0]));
    },
    (r) => {
      r.startedAt = "2026-02-30T00:00:00.000Z";
    },
    (r) => {
      r.startedAt = "October 29 2026";
    },
    (r) => {
      r.finishedAt = "2000-01-01T00:00:00.000Z";
    },
    (r) => {
      r.environmentFingerprint = "not-a-fingerprint";
    },
    (r) => {
      r.results[0].environmentFingerprint = "f".repeat(64);
    },
    (r) => {
      r.results[0].reproduction.seed = "conflicting-seed";
    },
    (r) => {
      r.results[0].protocols = ["tus"];
    },
    (r) => {
      delete r.finishedAt;
    },
    (r) => {
      r.results = [];
    },
  ];
  for (const corrupt of invalid) {
    const r = structuredClone(complete);
    corrupt(r);
    assert.throws(() => compareReports(complete, r));
  }
});
