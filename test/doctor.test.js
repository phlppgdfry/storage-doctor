import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { loadConfig, localUrl } from "../src/config.js";
import { run } from "../src/runner.js";
import { Adapter } from "../src/adapter.js";
import { html, writeReport, exportFinding } from "../src/report.js";
import { startFixture, fixtureEnv } from "./fixture.js";

test("all ten scenarios use wire protocols, preserve bytes, and clean up owned objects", async () => {
  const f = await startFixture();
  f.objects.set("storage-doctor-test/unrelated", {
    bytes: Buffer.from("keep"),
    headers: {},
  });
  try {
    const r = await run(loadConfig(fixtureEnv(f.base)), { mode: "fixture" });
    assert.equal(r.summary.passed, 10);
    assert.equal(r.exitCode, 0);
    assert.equal(f.objects.size, 1);
    assert.equal(f.objects.values().next().value.bytes.toString(), "keep");
    assert.ok(f.requests.some((x) => x.method === "PATCH"));
    const serialized = JSON.stringify(r);
    for (const secret of [
      "fixture-secret-token",
      "fixture-access",
      "fixture-secret",
    ])
      assert.ok(!serialized.includes(secret));
  } finally {
    await f.close();
  }
});
test("corrupt data produces a failure, not a passing compatibility claim", async () => {
  const f = await startFixture({ corrupt: true });
  try {
    const r = await run(loadConfig(fixtureEnv(f.base)), {
      only: "s3-roundtrip",
    });
    assert.equal(r.summary.failed, 1);
    assert.equal(r.exitCode, 1);
    assert.equal(f.objects.size, 0);
  } finally {
    await f.close();
  }
});
test("authorization failures remain inconclusive", async () => {
  const f = await startFixture({ denied: true });
  try {
    const r = await run(loadConfig(fixtureEnv(f.base)), {
      only: "s3-roundtrip",
    });
    assert.equal(r.summary.inconclusive, 1);
    assert.equal(r.exitCode, 2);
    assert.ok(r.cleanupWarnings.length);
  } finally {
    await f.close();
  }
});
test("cleanup failure prevents a green CI exit", async () => {
  const f = await startFixture({ cleanupFails: true });
  try {
    const r = await run(loadConfig(fixtureEnv(f.base)), {
      only: "s3-roundtrip",
    });
    assert.equal(r.summary.passed, 1);
    assert.equal(r.exitCode, 2);
    assert.equal(r.cleanupWarnings.length, 1);
  } finally {
    await f.close();
  }
});
test("S3 profile explicitly marks cross-protocol capabilities unsupported", async () => {
  const f = await startFixture();
  try {
    const r = await run(
      loadConfig({ ...fixtureEnv(f.base), SD_PROFILE: "s3" }),
    );
    assert.equal(r.summary.passed, 5);
    assert.equal(r.summary.unsupported, 5);
    assert.equal(r.exitCode, 0);
  } finally {
    await f.close();
  }
});
test("TUS Location cannot redirect credentials outside its endpoint", async () => {
  const f = await startFixture({ location: "http://127.0.0.1:9/steal" });
  try {
    const r = await run(loadConfig(fixtureEnv(f.base)), {
      only: "tus-resume-cross",
    });
    assert.equal(r.summary.failed, 1);
    assert.equal(f.requests.length, 2);
  } finally {
    await f.close();
  }
});
test("configuration blocks external hosts, ambiguous names and URL secrets", () => {
  for (const url of [
    "https://example.com",
    "http://localhost:5000",
    "http://127.0.0.1.evil.org",
    "http://127.0.0.1?token=secret",
    "http://user:secret@127.0.0.1",
    "ftp://127.0.0.1",
  ])
    assert.throws(() => localUrl(url));
  assert.throws(() =>
    loadConfig({ ...fixtureEnv("http://127.0.0.1"), SD_BUCKET: "production" }),
  );
  assert.throws(() =>
    loadConfig({ ...fixtureEnv("http://127.0.0.1"), SD_TIMEOUT_MS: "NaN" }),
  );
});
test("export preserves original evidence, checksums and reproducible scenario", async () => {
  const f = await startFixture(),
    dir = await mkdtemp(join(tmpdir(), "storage-doctor-test-"));
  try {
    const r = await run(loadConfig(fixtureEnv(f.base)), {
      only: "s3-roundtrip",
      mode: "fixture",
    });
    await writeReport(r, join(dir, "run"));
    await exportFinding(
      join(dir, "run/report.json"),
      "s3-roundtrip",
      join(dir, "export"),
    );
    assert.match(
      await readFile(join(dir, "export/REPRODUCE.md"), "utf8"),
      /--only s3-roundtrip/,
    );
    assert.deepEqual(
      JSON.parse(await readFile(join(dir, "export/original-report.json"))),
      r,
    );
    assert.ok(
      JSON.parse(await readFile(join(dir, "export/checksums.json")))[
        "report.json"
      ],
    );
    assert.ok(
      !html({
        ...r,
        config: { ...r.config, targetVersion: "<script>alert(1)</script>" },
      }).includes("<script>"),
    );
  } finally {
    await f.close();
    await rm(dir, { recursive: true, force: true });
  }
});
test("CLI rejects unknown options and nonlocal execution", () => {
  for (const args of [["check"], ["check", "--oops"]]) {
    const result = spawnSync(process.execPath, ["src/cli.js", ...args], {
      encoding: "utf8",
    });
    assert.equal(result.status, 2);
  }
});
test("exploration budget prevents new requests and still permits owned cleanup", async () => {
  const f = await startFixture();
  try {
    const c = loadConfig(fixtureEnv(f.base)),
      adapter = new Adapter(c);
    adapter.requests = 80;
    const r = await run(c, { adapter, only: "s3-roundtrip" });
    assert.equal(r.summary.inconclusive, 1);
    assert.equal(r.exitCode, 2);
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].method, "DELETE");
    assert.equal(f.objects.size, 0);
  } finally {
    await f.close();
  }
});
