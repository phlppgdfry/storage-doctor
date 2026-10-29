import { demo } from "../src/demo.js";
const report = await demo({
  corrupt: process.argv.includes("--inject-corruption"),
});
console.log(
  "PROTOCOL FIXTURE — does not establish real storage compatibility.",
);
for (const r of report.results) console.log(`${r.status.padEnd(13)} ${r.id}`);
console.log(`Report: ${report.reportDirectory}/report.html`);
process.exitCode = report.exitCode;
