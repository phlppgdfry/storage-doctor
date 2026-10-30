import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execute = promisify(execFile);

test("hosted consumer awaits missing-report checks for both invalid setup cases", async () => {
  for (const scenario of ["invalid-pack", "missing-credentials"]) {
    const directory = await mkdtemp(join(tmpdir(), "sd-hosted-verdict-"));
    try {
      await writeFile(
        join(directory, "fixture-cleanup.json"),
        JSON.stringify({ objects: 0, requests: 0 }),
      );
      const env = {
        ...process.env,
        RUNNER_TEMP: directory,
        SD_CONSUMER_CASE: scenario,
        SD_ACTION_OUTCOME: "failure",
        SD_TESTED_COMMIT: "test-only",
      };
      if (scenario === "invalid-pack")
        env.SD_GENERATED_REPORT = join(directory, "absent-report");
      else delete env.SD_GENERATED_REPORT;
      const result = await execute(
        process.execPath,
        [resolve("scripts/hosted-consumer-assert.js")],
        { env },
      );
      const verdict = JSON.parse(result.stdout);
      assert.equal(verdict.expectedExit, 2);
      assert.equal(verdict.invalidSetupNoArtifact, true);
      assert.equal(verdict.artifactVerified, false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
});
