// Genuine timed stdout/stderr capture. Captions are scripted narration, not user input.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { sourceFingerprint } from "../src/fingerprint.js";
const directory = resolve(`reports/showcase-${randomUUID()}`);
await mkdir(directory, { mode: 0o700 });
const started = performance.now(),
  events = [],
  commands = [];
const output = (text) => {
  events.push([
    (performance.now() - started) / 1000,
    "o",
    text.replace(/\r?\n/g, "\r\n"),
  ]);
  process.stdout.write(text);
};
const at = async (seconds) => {
  const remaining = seconds * 1000 - (performance.now() - started);
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
};
const cli = async (args, expected) => {
  output(`\n$ node ../../src/cli.js ${args.join(" ")}\n`);
  const child = spawn(process.execPath, [resolve("src/cli.js"), ...args], {
    cwd: directory,
    env: Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith("SD_")),
    ),
  });
  child.stdout.on("data", (data) => output(data.toString()));
  child.stderr.on("data", (data) => output(data.toString()));
  const code = await new Promise((r, j) => {
    child.on("error", j);
    child.on("close", r);
  });
  output(`[actual exit: ${code}; expected: ${expected}]\n`);
  commands.push({ args, expected, exitCode: code });
  assert.equal(code, expected);
};
output(
  "STORAGE DOCTOR — actual command recording / about 45 seconds\nFIXTURE + INJECTED CORRUPTION. This is not a Supabase defect.\n",
);
await at(3);
await cli(["demo", "--out", "good"], 0);
await at(12);
await cli(["demo", "--inject-corruption", "--out", "bad"], 1);
await at(22);
await cli(
  ["compare", "--baseline", "good/report.json", "--report", "bad/report.json"],
  1,
);
await at(32);
await cli(
  ["export", "rest-to-s3", "--report", "bad/report.json", "--out", "bundle"],
  0,
);
await cli(["verify", "--report", "bundle"], 0);
await at(39);
output(
  "\nReproduce: run these same commands in a new directory.\nEvidence: good/, bad/, bundle/ contain the actual reports and checksums.\nAn unavailable or incompatible comparison exits 2, not 0.\nReview protocol expectations before attributing any real target defect.\n",
);
await at(45);
output("\nRecording complete — actual outputs and evidence retained.\n");
const durationSeconds = (performance.now() - started) / 1000;
const header = {
  version: 2,
  width: 112,
  height: 32,
  timestamp: Math.floor(Date.now() / 1000),
  title: "Storage Doctor: actual fixture regression capture",
  env: { TERM: "xterm-256color" },
};
await writeFile(
  `${directory}/regression.cast`,
  [JSON.stringify(header), ...events.map((e) => JSON.stringify(e))].join("\n") +
    "\n",
  { flag: "wx" },
);
await writeFile(
  `${directory}/transcript.txt`,
  events.map((e) => e[2]).join(""),
  { flag: "wx" },
);
await writeFile(
  `${directory}/recording.json`,
  JSON.stringify(
    {
      durationSeconds,
      sourceFingerprint: await sourceFingerprint(),
      node: process.version,
      commands,
      limitations:
        "Scripted command invocation and narration; captured real stdout/stderr at actual wall-clock times. Fixture, not vendor evidence. No acceleration or fabricated results.",
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
console.log(`\nRecording and genuine evidence: ${directory}`);
