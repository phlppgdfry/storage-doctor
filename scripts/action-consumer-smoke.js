// Local shell-step consumer validation. This does not emulate GitHub's runner,
// setup-node or artifact service; actionlint/hosted CI cover different boundaries.
import { mkdtemp, cp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import { startFixture, fixtureEnv } from "../src/demo-fixture.js";
const execute = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), "sd-action-consumer-"));
const fixture = await startFixture();
try {
  const action = join(directory, "external-action");
  for (const name of [
    "src",
    "scripts",
    "package.json",
    "package-lock.json",
    "action.yml",
  ])
    await cp(resolve(name), join(action, name), { recursive: true });
  // Read actual shell commands, including block scalars, from this constrained
  // manifest. Fail closed if its command layout changes; not a general YAML parser.
  const manifest = await readFile(join(action, "action.yml"), "utf8");
  const commands = [
    ...manifest.matchAll(/^      run: (.+)(?:\n((?:        .*\n)*))?/gm),
  ].map((m) => (m[1] === "|" ? m[2].replace(/^        /gm, "") : m[1]));
  assert.equal(
    commands.length,
    5,
    "Update smoke when Action shell steps change",
  );
  const summary = join(directory, "summary.md");
  const output = join(directory, "output");
  await writeFile(output, "");
  const env = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith("SD_")),
    ),
    ...fixtureEnv(fixture.base),
    GITHUB_ACTION_PATH: action,
    RUNNER_TEMP: directory,
    GITHUB_OUTPUT: output,
    GITHUB_STEP_SUMMARY: summary,
    SD_ACTION_PACK: "core",
  };
  await execute("bash", ["-e", "-c", commands[0]], { cwd: action, env });
  await execute("bash", ["-e", "-c", commands[1]], { cwd: directory, env });
  env.SD_ACTION_OUT = (await readFile(output, "utf8"))
    .trim()
    .slice("directory=".length);
  await execute("bash", ["-e", "-c", commands[2]], { cwd: directory, env });
  env.SD_ACTION_BASELINE = join(env.SD_ACTION_OUT, "report.json");
  await execute("bash", ["-e", "-c", commands[3]], { cwd: directory, env });
  await execute("bash", ["-e", "-c", commands[4]], { cwd: directory, env });
  assert.match(await readFile(summary, "utf8"), /s3-roundtrip \| PASSED/);
  const corrupted = await startFixture({ corrupt: true });
  try {
    Object.assign(env, fixtureEnv(corrupted.base));
    env.SD_ACTION_OUT = join(directory, "failed-evidence");
    const failure = await execute("bash", ["-e", "-c", commands[2]], {
      cwd: directory,
      env,
    }).catch((error) => error);
    assert.equal(failure.code, 1);
    const regression = await execute("bash", ["-e", "-c", commands[3]], {
      cwd: directory,
      env,
    }).catch((error) => error);
    assert.equal(regression.code, 1);
    await execute("bash", ["-e", "-c", commands[4]], { cwd: directory, env });
    assert.match(await readFile(summary, "utf8"), /s3-roundtrip \| FAILED/);
    assert.equal(corrupted.objects.size, 0);
  } finally {
    await corrupted.close();
  }
  env.SD_ACTION_OUT = join(directory, "missing-evidence");
  await execute("bash", ["-e", "-c", commands[4]], { cwd: directory, env });
  assert.match(await readFile(summary, "utf8"), /No valid report was produced/);
  assert.equal(fixture.objects.size, 0);
  console.log(
    JSON.stringify({
      result: "passed",
      target: "fixture",
      shellSteps: 5,
      checks: 3,
      faultChecks: 3,
      consumer: "separate temporary directory",
      limitations:
        "Local shell execution, not hosted GitHub runner/setup-node/artifact validation",
    }),
  );
} finally {
  await fixture.close();
  await rm(directory, { recursive: true, force: true });
}
