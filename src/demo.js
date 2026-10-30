import { resolve } from "node:path";
import { startFixture, fixtureEnv } from "./demo-fixture.js";
import { loadConfig } from "./config.js";
import { run } from "./runner.js";
import { writeReport } from "./report.js";

export async function demo({ out, corrupt = false } = {}) {
  const fixture = await startFixture({ corrupt });
  try {
    const report = await run(loadConfig(fixtureEnv(fixture.base)), {
      mode: "fixture",
    });
    const directory = resolve(out || `reports/demo-${report.runId}`);
    await writeReport(report, directory);
    return { ...report, reportDirectory: directory };
  } finally {
    await fixture.close();
  }
}
