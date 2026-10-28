// The CLI status output stays in memory: never log its credentials.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { loadConfig } from "../src/config.js";
import { run } from "../src/runner.js";
import { writeReport } from "../src/report.js";
const workdir = new URL("..", import.meta.url).pathname;
let status;
try {
  status = JSON.parse(
    execFileSync("supabase", ["status", "--workdir", workdir, "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
} catch {
  console.error(
    "Start the dedicated Storage Doctor Supabase stack first; see README.",
  );
  process.exit(2);
}
const get = (...names) => names.map((n) => status[n]).find(Boolean);
const api = get("API_URL", "api_url");
const token = get("SERVICE_ROLE_KEY", "service_role_key");
const access = get("S3_PROTOCOL_ACCESS_KEY_ID", "s3_protocol_access_key_id");
const secret = get(
  "S3_PROTOCOL_ACCESS_KEY_SECRET",
  "s3_protocol_access_key_secret",
);
if (!api || !token || !access || !secret) {
  console.error(
    "Local CLI status lacks API/service-role/S3 credentials. Enable storage.s3_protocol.",
  );
  process.exit(2);
}
// Reject other project ports even if CLI discovery changes.
if (api !== "http://127.0.0.1:55431") {
  console.error("Expected dedicated loopback API port 55431.");
  process.exit(2);
}
let image = "unrecorded";
try {
  image = execFileSync(
    "docker",
    [
      "inspect",
      "supabase_storage_storage-doctor",
      "--format",
      "{{.Config.Image}}",
    ],
    { encoding: "utf8" },
  ).trim();
} catch {}
const config = loadConfig({
  SD_REST_URL: `${api}/storage/v1`,
  SD_TOKEN: token,
  SD_API_KEY: token,
  SD_ACCESS_KEY_ID: access,
  SD_SECRET_ACCESS_KEY: secret,
  SD_TARGET_VERSION: image,
  SD_REGION: get("S3_PROTOCOL_REGION", "s3_protocol_region") || "local",
  SD_BUCKET: `sd-${randomUUID()}`,
});
const bucketUrl = `${config.restUrl}/bucket`;
const headers = {
  authorization: `Bearer ${token}`,
  apikey: token,
  "content-type": "application/json",
};
const created = await fetch(bucketUrl, {
  method: "POST",
  headers,
  body: JSON.stringify({
    id: config.bucket,
    name: config.bucket,
    public: false,
  }),
  redirect: "error",
  signal: AbortSignal.timeout(10000),
});
if (!created.ok) {
  console.error(`Could not provision dedicated bucket: HTTP ${created.status}`);
  await created.body?.cancel();
  process.exit(2);
}
await created.body?.cancel();
let report;
try {
  report = await run(config);
} finally {
  const removed = await fetch(`${bucketUrl}/${config.bucket}`, {
    method: "DELETE",
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (removed) await removed.body?.cancel();
  if (report && !removed?.ok) {
    report.cleanupWarnings.push(
      `Dedicated bucket cleanup failed: ${config.bucket}`,
    );
    report.exitCode = 2;
  }
}
await writeReport(report, "reports/integration");
console.log(
  JSON.stringify(
    {
      targetVersion: report.config.targetVersion,
      summary: report.summary,
      cleanupWarnings: report.cleanupWarnings,
      exitCode: report.exitCode,
    },
    null,
    2,
  ),
);
for (const result of report.results)
  if (result.status !== "passed") console.log(`${result.id}: ${result.reason}`);
process.exitCode = report.exitCode;
