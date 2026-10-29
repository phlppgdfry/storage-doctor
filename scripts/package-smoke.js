import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { startFixture, fixtureEnv } from "../test/fixture.js";
const execute = promisify(execFile),
  directory = await mkdtemp(join(tmpdir(), "storage-doctor-package-"));
const fresh = process.argv.includes("--fresh");
const offline = process.argv.includes("--offline");
assert.ok(
  !(fresh && offline),
  "An empty cache cannot resolve registry dependencies offline",
);
const started = performance.now();
let fixture;
try {
  const packed = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", directory], {
      encoding: "utf8",
    }),
  );
  const artifact = Array.isArray(packed) ? packed[0] : Object.values(packed)[0];
  assert.ok(artifact?.filename);
  const consumer = join(directory, "consumer");
  await mkdir(consumer);
  const archive = join(directory, artifact.filename);
  const dependency = `file:${archive}`;
  const rootLock = JSON.parse(await readFile("package-lock.json", "utf8"));
  const rootPackage = JSON.parse(await readFile("package.json", "utf8"));
  const consumerPackage = {
    name: "storage-doctor-consumer",
    private: true,
    dependencies: { "storage-doctor": dependency },
  };
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify(consumerPackage),
  );
  // Seed the consumer graph from the audited lockfile so the smoke test uses
  // the same dependency graph as the package being validated.
  const consumerLock = {
    name: consumerPackage.name,
    lockfileVersion: 3,
    requires: true,
    packages: {
      ...rootLock.packages,
      "": {
        name: consumerPackage.name,
        dependencies: consumerPackage.dependencies,
      },
      "node_modules/storage-doctor": {
        version: rootPackage.version,
        resolved: dependency,
        integrity: artifact.integrity,
        license: rootPackage.license,
        dependencies: rootPackage.dependencies,
        bin: rootPackage.bin,
        engines: rootPackage.engines,
      },
    },
  };
  if (!fresh)
    await writeFile(
      join(consumer, "package-lock.json"),
      JSON.stringify(consumerLock),
    );
  const installStarted = performance.now();
  execFileSync(
    "npm",
    [
      fresh ? "install" : "ci",
      ...(fresh ? ["--cache", join(directory, "empty-cache")] : []),
      offline ? "--offline" : "--prefer-offline",
      "--ignore-scripts",
      "--omit=dev",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: consumer, stdio: "pipe" },
  );
  const installationMs = Math.round(performance.now() - installStarted);
  const bin = join(consumer, "node_modules/.bin/storage-doctor");
  fixture = await startFixture();
  const env = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith("SD_")),
    ),
    ...fixtureEnv(fixture.base),
  };
  const cli = async (...args) =>
    JSON.parse((await execute(bin, args, { cwd: consumer, env })).stdout);
  assert.equal((await cli("--version", "--json")).version, rootPackage.version);
  const demoStarted = performance.now();
  const demoReport = await cli(
    "demo",
    "--out",
    join(directory, "demo"),
    "--json",
  );
  const demoWallMs = Math.round(performance.now() - demoStarted);
  const timeToFixtureReportMs = Math.round(performance.now() - started);
  assert.equal(demoReport.mode, "fixture");
  assert.equal(demoReport.summary.passed, 10);
  assert.equal(
    (
      await cli(
        "compare",
        "--baseline",
        join(directory, "demo/report.json"),
        "--report",
        join(directory, "demo/report.json"),
        "--json",
      )
    ).outcome,
    "no-regression",
  );
  assert.equal((await cli("list", "--json")).length, 10);
  assert.equal((await cli("doctor", "--json")).networkContacted, false);
  const report = await cli(
    "check",
    "--local",
    "--only",
    "rest-to-s3",
    "--out",
    join(directory, "run"),
    "--json",
  );
  assert.equal(report.summary.passed, 1);
  await cli(
    "report",
    "--report",
    join(directory, "run/report.json"),
    "--out",
    join(directory, "render"),
    "--json",
  );
  await cli(
    "export",
    "rest-to-s3",
    "--report",
    join(directory, "run/report.json"),
    "--out",
    join(directory, "bundle"),
    "--json",
  );
  assert.equal(
    (await cli("verify", "--report", join(directory, "bundle"), "--json"))
      .files,
    5,
  );
  assert.equal(
    (
      await cli(
        "plan",
        "--report",
        join(directory, "run/report.json"),
        "--json",
      )
    ).next,
    "rest-to-s3",
  );
  const quiet = await execute(bin, ["doctor", "--quiet"], {
    cwd: consumer,
    env,
  });
  assert.equal(quiet.stdout, "");
  assert.equal(fixture.objects.size, 0);
  console.log(
    JSON.stringify({
      freshRegistryResolution: fresh,
      installPolicy: offline
        ? "offline with prewarmed dependency archives"
        : "prefer-offline; registry permitted",
      installationMs,
      demoWallMs,
      timeToFixtureReportMs,
      totalWallMs: Math.round(performance.now() - started),
      packedBytes: artifact.size,
      unpackedBytes: artifact.unpackedSize,
      commands: [
        "version",
        "demo",
        "compare",
        "list",
        "doctor",
        "check",
        "report",
        "export",
        "verify",
        "plan",
        "quiet",
      ],
      result: "passed",
      target: "protocol fixture, not a real engine",
    }),
  );
} finally {
  await fixture?.close();
  await rm(directory, { recursive: true, force: true });
}
