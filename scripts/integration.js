// The CLI status output stays in memory: never log its credentials.
import { execFileSync } from "node:child_process";
import { readFile, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { loadConfig } from "../src/config.js";
import { run } from "../src/runner.js";
import { writeReport } from "../src/report.js";
import { directRequest } from "../src/transport.js";
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
  SD_AUTH_CONTEXT: "local-service-role",
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
const actionState = process.env.RUNNER_TEMP
  ? join(process.env.RUNNER_TEMP, "storage-doctor-owned-bucket.json")
  : null;
if (process.argv[2] === "--cleanup-action") {
  if (!actionState) throw new Error("Action cleanup requires runner state.");
  const state = JSON.parse(await readFile(actionState, "utf8"));
  if (!/^sd-[0-9a-f-]{36}$/.test(state.bucket))
    throw new Error("Invalid owned bucket state.");
  const result = await directRequest(`${bucketUrl}/${state.bucket}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}`, apikey: token },
    timeoutMs: 10000,
  });
  if (![200, 204, 404].includes(result.status))
    throw new Error("Owned action bucket cleanup failed.");
  console.log("Owned Action bucket cleanup passed.");
  process.exit(0);
}
if (
  process.argv[2] === "--provision-action" &&
  (!actionState || !process.env.GITHUB_ENV)
)
  throw new Error("Action provisioning requires GitHub runner environment.");
const headers = {
  authorization: `Bearer ${token}`,
  apikey: token,
  "content-type": "application/json",
};
const created = await directRequest(bucketUrl, {
  method: "POST",
  headers,
  body: JSON.stringify({
    id: config.bucket,
    name: config.bucket,
    public: false,
  }),
  timeoutMs: 10000,
  signal: AbortSignal.timeout(10000),
});
if (![200, 201].includes(created.status)) {
  console.error(`Could not provision dedicated bucket: HTTP ${created.status}`);

  process.exit(2);
}

if (process.argv[2] === "--provision-action") {
  await writeFile(actionState, JSON.stringify({ bucket: config.bucket }), {
    mode: 0o600,
    flag: "wx",
  });
  const values = {
    SD_AUTH_CONTEXT: config.authContext,
    SD_PROFILE: "supabase",
    SD_BUCKET: config.bucket,
    SD_REST_URL: config.restUrl,
    SD_S3_URL: config.s3Url,
    SD_TUS_URL: config.tusUrl,
    SD_TOKEN: token,
    SD_API_KEY: token,
    SD_ACCESS_KEY_ID: access,
    SD_SECRET_ACCESS_KEY: secret,
    SD_REGION: config.region,
    SD_TARGET_VERSION: config.targetVersion,
  };
  for (const value of [token, access, secret])
    console.log(`::add-mask::${value}`);
  await appendFile(
    process.env.GITHUB_ENV,
    Object.entries(values)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n",
  );
  console.log(
    "Dedicated private Action bucket provisioned; credentials masked.",
  );
  process.exit(0);
}

let report;
try {
  report = await run(config, { only: process.argv[2] });
} finally {
  const removed = await directRequest(`${bucketUrl}/${config.bucket}`, {
    method: "DELETE",
    headers,
    timeoutMs: 10000,
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);

  if (report && !removed?.status.toString().startsWith("2")) {
    report.cleanupWarnings.push(
      `Dedicated bucket cleanup failed: ${config.bucket}`,
    );
    report.exitCode = 2;
  }
}
const reportDirectory = `reports/integration-${report.runId}`;
await writeReport(report, reportDirectory);
console.log(`Evidence: ${reportDirectory}`);
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
