import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const directory = await mkdtemp(join(tmpdir(), "storage-doctor-package-"));
try {
  const packed = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", directory], {
      encoding: "utf8",
    }),
  );
  const consumer = join(directory, "consumer");
  // npm releases differ: older versions return an array, newer ones a name map.
  const artifact = Array.isArray(packed) ? packed[0] : Object.values(packed)[0];
  assert.ok(artifact?.filename, "npm pack must return an artifact filename");
  const { mkdir } = await import("node:fs/promises");
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
  const help = execFileSync(bin, ["--help"], { encoding: "utf8" });
  const list = execFileSync(bin, ["list"], { encoding: "utf8" });
  assert.match(help, /Storage Doctor 0.1.0/);
  assert.equal(list.trim().split("\n").length, 10);
  console.log(
    "Packed CLI installed offline in a clean consumer: help and ten-scenario list passed.",
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
