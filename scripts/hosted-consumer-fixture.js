// Hosted validation only: synthetic protocol fixture, never vendor evidence.
import { writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { startFixture, fixtureEnv } from "../src/demo-fixture.js";
const directory = process.env.RUNNER_TEMP;
const scenario = process.env.SD_CONSUMER_CASE;
if (
  !directory ||
  !["success", "corruption", "invalid-pack", "missing-credentials"].includes(
    scenario,
  )
)
  throw new Error("Expected an isolated hosted consumer case.");
const fixture = await startFixture({ corrupt: scenario === "corruption" });
const values = { ...fixtureEnv(fixture.base), SD_PROFILE: "supabase" };
for (const value of [
  values.SD_TOKEN,
  values.SD_ACCESS_KEY_ID,
  values.SD_SECRET_ACCESS_KEY,
])
  console.log(`::add-mask::${value}`);
if (scenario === "missing-credentials") values.SD_TOKEN = "";
await appendFile(
  process.env.GITHUB_ENV,
  Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n",
);
await writeFile(join(directory, "fixture.pid"), String(process.pid), {
  flag: "wx",
});
await writeFile(join(directory, "fixture.ready"), "synthetic fixture ready\n", {
  flag: "wx",
});
await new Promise((resolve) => process.once("SIGTERM", resolve));
await fixture.close();
await writeFile(
  join(directory, "fixture-cleanup.json"),
  JSON.stringify({
    objects: fixture.objects.size,
    requests: fixture.requests.length,
    mode: "synthetic fixture, not vendor evidence",
  }) + "\n",
  { flag: "wx" },
);
