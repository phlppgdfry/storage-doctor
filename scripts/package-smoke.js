import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { startFixture, fixtureEnv } from "../test/fixture.js";
const execute = promisify(execFile),
  directory = await mkdtemp(join(tmpdir(), "storage-doctor-package-"));
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
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({ name: "storage-doctor-consumer", private: true }),
  );
  execFileSync(
    "npm",
    [
      "install",
      join(directory, artifact.filename),
      "--offline",
      "--ignore-scripts",
      "--omit=dev",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: consumer, stdio: "pipe" },
  );
  const bin = join(consumer, "node_modules/.bin/storage-doctor");
  fixture = await startFixture();
  const env = { ...process.env, ...fixtureEnv(fixture.base) };
  const cli = async (...args) =>
    JSON.parse((await execute(bin, args, { cwd: consumer, env })).stdout);
  assert.equal((await cli("--version", "--json")).version, "0.2.0");
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
      packedBytes: artifact.size,
      unpackedBytes: artifact.unpackedSize,
      commands: [
        "version",
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
