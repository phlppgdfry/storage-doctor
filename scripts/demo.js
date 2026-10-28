import { startFixture, fixtureEnv } from "../test/fixture.js";
import { loadConfig } from "../src/config.js";
import { run } from "../src/runner.js";
import { writeReport } from "../src/report.js";
const fixture = await startFixture({
  corrupt: process.argv.includes("--inject-corruption"),
});
try {
  const report = await run(loadConfig(fixtureEnv(fixture.base)), {
    mode: "fixture",
  });
  const directory = `reports/demo-${report.runId}`;
  await writeReport(report, directory);
  console.log(
    "PROTOCOL FIXTURE — does not establish real storage compatibility.",
  );
  for (const r of report.results) console.log(`${r.status.padEnd(13)} ${r.id}`);
  console.log(`Report: ${directory}/report.html`);
  process.exitCode = report.exitCode;
} finally {
  await fixture.close();
}
