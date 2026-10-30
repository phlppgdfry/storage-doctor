// Validate actual Action results and downloaded files from an isolated consumer.
import assert from "node:assert/strict";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readReport } from "../src/schema.js";
import { verifyBundle } from "../src/report.js";
const scenario = process.env.SD_CONSUMER_CASE;
const expected = scenario === "success" ? 0 : scenario === "corruption" ? 1 : 2;
const directory = process.env.RUNNER_TEMP;
assert.equal(
  process.env.SD_ACTION_OUTCOME,
  expected === 0 ? "success" : "failure",
);
const cleanup = JSON.parse(
  await readFile(join(directory, "fixture-cleanup.json"), "utf8"),
);
assert.equal(cleanup.objects, 0, "Action must leave no synthetic objects");
const generated = process.env.SD_GENERATED_REPORT;
if (expected === 2) {
  assert.equal(cleanup.requests, 0, "Invalid setup must not reach storage");
  assert.equal(
    (generated
      ? access(join(generated, "report.json"))
      : Promise.reject()
    ).then(
      () => true,
      () => false,
    ),
    false,
  );
} else {
  const downloaded = join(directory, "retrieved-evidence");
  const verified = await verifyBundle(downloaded);
  assert.equal(verified.files, 3);
  const report = await readReport(join(downloaded, "report.json"));
  assert.equal(report.exitCode, expected);
  assert.equal(report.results.length, 3);
  assert.equal(report.summary[expected === 0 ? "passed" : "failed"], 3);
  assert.equal(report.cleanupWarnings.length, 0);
  for (const file of ["report.json", "report.md", "report.html"]) {
    assert.equal(
      await readFile(join(generated, file), "utf8"),
      await readFile(join(downloaded, file), "utf8"),
    );
    const content = await readFile(join(downloaded, file), "utf8");
    for (const secret of [
      "fixture-secret-token",
      "fixture-access",
      "fixture-secret",
    ])
      assert.ok(!content.includes(secret), "Evidence must exclude credentials");
  }
}
const result = {
  scenario,
  expectedExit: expected,
  actionOutcome: process.env.SD_ACTION_OUTCOME,
  sourceCommit: process.env.SD_TESTED_COMMIT,
  cleanup,
  artifactVerified: expected !== 2,
  invalidSetupNoArtifact: expected === 2,
};
await writeFile(
  join(directory, "consumer-verdict.json"),
  JSON.stringify(result, null, 2) + "\n",
  { flag: "wx" },
);
console.log(JSON.stringify(result));
