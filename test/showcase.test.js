import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildShowcase, checkShowcase } from "../scripts/build-showcase.js";

test("Pages artifact contains real evidence and rejects broken links or tampered reports", async () => {
  const directory = await mkdtemp(join(tmpdir(), "storage-doctor-pages-"));
  try {
    const output = join(directory, "site");
    const result = await buildShowcase(output);
    assert.equal(result.verifiedBundles, 3);
    const report = join(output, "reports/local-supabase/report.html");
    await rename(report, report + ".saved");
    await assert.rejects(checkShowcase(output), /ENOENT/);
    await rename(report + ".saved", report);
    await writeFile(report, "tampered evidence");
    await assert.rejects(
      checkShowcase(output),
      /Bundle integrity verification failed/,
    );
    await assert.rejects(buildShowcase(output), /EEXIST/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
