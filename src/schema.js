import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { localUrl } from "./config.js";
import { scenarios } from "./scenarios.js";
import { summarize } from "./runner.js";

export const STATUSES = [
  "passed",
  "failed",
  "unsupported",
  "skipped",
  "inconclusive",
  "error",
];
export class ReportError extends Error {}
const fail = () => {
  throw new ReportError(
    "Invalid or unsafe report. Expected a bounded Storage Doctor schema 1 or 2 report.",
  );
};
const text = (x, max = 512) => {
  if (
    typeof x !== "string" ||
    x.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(x)
  )
    fail();
  return x;
};
const number = (x, max = 3600000) => {
  if (!Number.isFinite(x) || x < 0 || x > max) fail();
  return x;
};
const object = (x, keys) => {
  if (
    !x ||
    typeof x !== "object" ||
    Array.isArray(x) ||
    Object.keys(x).some((k) => !keys.includes(k))
  )
    fail();
  return x;
};
const list = (x, max = 200) => {
  if (!Array.isArray(x) || x.length > max) fail();
  return x;
};
const safeText = (x, max) => {
  const value = text(x, max);
  // Never preserve recognizable credential material, even inside known fields.
  if (
    /(?:Bearer\s+\S+|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+|sb_secret_|AKIA[A-Z0-9]{12,}|(?:password|secret|token|authorization)\s*[:=]\s*\S+)/i.test(
      value,
    )
  )
    fail();
  return value;
};
const trace = (entries) =>
  list(entries).map((t) => {
    object(t, ["protocol", "operation", "status", "ms"]);
    if (!["rest", "s3", "tus"].includes(t.protocol)) fail();
    const operation = text(t.operation, 64);
    if (!/^[A-Za-z]+$/.test(operation)) fail();
    if (
      t.status !== null &&
      (!Number.isInteger(t.status) || t.status < 100 || t.status > 599)
    )
      fail();
    return {
      protocol: t.protocol,
      operation,
      status: t.status,
      ms: number(t.ms),
    };
  });
const warnings = (x) => list(x, 40).map((w) => safeText(w, 1200));
export function validateReport(r) {
  if (
    r?.sourceRunId !== undefined &&
    (typeof r.sourceRunId !== "string" ||
      !/^[0-9a-f-]{36}$/.test(r.sourceRunId))
  )
    fail();
  if (
    r?.sourceSchemaVersion !== undefined &&
    ![1, 2].includes(r.sourceSchemaVersion)
  )
    fail();
  object(r, [
    "schemaVersion",
    "sourceSchemaVersion",
    "sourceFingerprint",
    "toolVersion",
    "runId",
    "sourceRunId",
    "mode",
    "startedAt",
    "finishedAt",
    "nodeVersion",
    "platform",
    "config",
    "budget",
    "payloadSha256",
    "environmentFingerprint",
    "results",
    "cleanupWarnings",
    "summary",
    "exitCode",
  ]);
  if (
    ![1, 2].includes(r.schemaVersion) ||
    !["live", "fixture"].includes(r.mode)
  )
    fail();
  if (!/^[0-9a-f-]{36}$/.test(text(r.runId, 36))) fail();
  if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(text(r.toolVersion, 40))) fail();
  for (const date of [r.startedAt, r.finishedAt])
    if (!Number.isFinite(Date.parse(text(date, 40)))) fail();
  object(r.config, [
    "profile",
    "bucket",
    "seed",
    "targetVersion",
    "timeoutMs",
    "restUrl",
    "s3Url",
    "tusUrl",
    "region",
  ]);
  const config = { ...r.config };
  if (
    !["supabase", "s3"].includes(config.profile) ||
    !/^(sd-|storage-doctor-)[a-z0-9-]{1,60}$/.test(text(config.bucket, 63))
  )
    fail();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(text(config.seed, 64))) fail();
  safeText(config.targetVersion, 160);
  number(config.timeoutMs, 30000);
  for (const k of ["restUrl", "s3Url", "tusUrl"]) {
    try {
      config[k] = localUrl(config[k]);
    } catch {
      fail();
    }
  }
  config.region = safeText(config.region || "unrecorded", 64);
  if (!/^[0-9a-f]{64}$/.test(text(r.payloadSha256, 64))) fail();
  const results = list(r.results, 10).map((item) => {
    object(item, [
      "id",
      "title",
      "description",
      "protocols",
      "prerequisites",
      "expected",
      "reference",
      "status",
      "reason",
      "reasonCode",
      "ms",
      "trace",
      "cleanup",
      "reproduction",
      "environmentFingerprint",
    ]);
    const s = scenarios.find((s) => s.id === item.id);
    if (!s || !STATUSES.includes(item.status)) fail();
    safeText(item.title, 200);
    safeText(item.reason, 1200);
    if (JSON.stringify(item.protocols) !== JSON.stringify(s.protocols)) fail();
    let cleanup = { status: "unrecorded", warnings: [] };
    if (item.cleanup) {
      object(item.cleanup, ["status", "warnings", "trace"]);
      if (
        !["passed", "failed", "not-needed", "unrecorded"].includes(
          item.cleanup.status,
        )
      )
        fail();
      cleanup = {
        status: item.cleanup.status,
        warnings: warnings(item.cleanup.warnings),
        ...(item.cleanup.trace ? { trace: trace(item.cleanup.trace) } : {}),
      };
      if (cleanup.warnings.length && cleanup.status !== "failed") fail();
    }
    if (item.reproduction) {
      object(item.reproduction, ["seed", "scenario"]);
      if (
        item.reproduction.seed !== config.seed ||
        item.reproduction.scenario !== s.id
      )
        fail();
    }
    for (const k of [
      "description",
      "expected",
      "reference",
      "reasonCode",
      "environmentFingerprint",
    ])
      if (item[k] !== undefined) safeText(item[k], 1200);
    if (item.prerequisites)
      list(item.prerequisites, 10).forEach((x) => safeText(x, 512));
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      protocols: s.protocols,
      prerequisites: s.prerequisites,
      expected: s.expected,
      reference: s.reference,
      status: item.status,
      reason: item.reason,
      reasonCode: item.reasonCode || "legacy",
      ms: number(item.ms),
      trace: trace(item.trace),
      cleanup,
      reproduction: { seed: config.seed, scenario: s.id },
      environmentFingerprint: r.environmentFingerprint || "unrecorded",
    };
  });
  if (
    new Set(results.map((x) => x.id)).size !== results.length ||
    !results.length
  )
    fail();
  if (
    r.sourceFingerprint !== undefined &&
    !/^[a-f0-9]{64}$/.test(r.sourceFingerprint)
  )
    fail();
  const cleanupWarnings = warnings(r.cleanupWarnings);
  object(r.summary, STATUSES);
  const calculated = summarize(results, cleanupWarnings);
  for (const k of STATUSES)
    if ((r.summary[k] || 0) !== calculated.summary[k]) fail();
  if (r.exitCode !== calculated.exitCode) fail();
  if (r.budget) {
    object(r.budget, [
      "maxScenarios",
      "maxRequests",
      "explorationDeadlineMs",
      "maxResponseBytes",
      "cleanupOutsideExplorationBudget",
      "cleanupDeadlineMs",
    ]);
    for (const [k, v] of Object.entries(r.budget))
      if (k === "cleanupOutsideExplorationBudget") {
        if (typeof v !== "boolean") fail();
      } else number(v, 100000000);
  }
  return {
    schemaVersion: 2,
    ...(r.schemaVersion === 1
      ? { sourceSchemaVersion: 1 }
      : r.sourceSchemaVersion
        ? { sourceSchemaVersion: r.sourceSchemaVersion }
        : {}),
    toolVersion: r.toolVersion,
    ...(r.sourceFingerprint ? { sourceFingerprint: r.sourceFingerprint } : {}),
    runId: r.runId,
    ...(r.sourceRunId ? { sourceRunId: text(r.sourceRunId, 36) } : {}),
    mode: r.mode,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    nodeVersion: safeText(r.nodeVersion, 40),
    platform: safeText(r.platform, 64),
    config,
    budget: r.budget,
    payloadSha256: r.payloadSha256,
    environmentFingerprint: safeText(
      r.environmentFingerprint || "unrecorded",
      64,
    ),
    results,
    cleanupWarnings,
    ...calculated,
  };
}
export async function readReport(path) {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 2097152) fail();
    const buffer = Buffer.alloc(2097153);
    let bytes = 0;
    while (bytes < buffer.length) {
      const result = await handle.read(
        buffer,
        bytes,
        buffer.length - bytes,
        null,
      );
      if (!result.bytesRead) break;
      bytes += result.bytesRead;
    }
    if (bytes > 2097152) fail();
    return validateReport(
      JSON.parse(buffer.subarray(0, bytes).toString("utf8")),
    );
  } catch {
    throw new ReportError(
      "Cannot read report: expected a valid schema 1/2 file no larger than 2 MiB.",
    );
  } finally {
    await handle?.close();
  }
}
