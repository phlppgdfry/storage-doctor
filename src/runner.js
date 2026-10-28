import { randomUUID, createHash } from "node:crypto";
import { Adapter, CheckFailure, ObservationError } from "./adapter.js";
import { publicConfig } from "./config.js";
import { scenarios, payload } from "./scenarios.js";

export async function run(config, { only, adapter, mode = "live" } = {}) {
  const selected = only ? scenarios.filter((s) => s.id === only) : scenarios;
  if (!selected.length)
    throw new Error("Unknown scenario ID. Use storage-doctor list.");
  const a = adapter || new Adapter(config);
  const runId = randomUUID();
  const report = {
    schemaVersion: 1,
    toolVersion: "0.1.0",
    runId,
    mode,
    startedAt: new Date().toISOString(),
    nodeVersion: process.version,
    platform: `${process.platform}/${process.arch}`,
    config: publicConfig(config),
    budget: {
      maxScenarios: 10,
      maxRequests: 80,
      explorationDeadlineMs: 120000,
      maxResponseBytes: 8388608,
      cleanupOutsideExplorationBudget: true,
    },
    payloadSha256: createHash("sha256")
      .update(payload(config.seed))
      .digest("hex"),
    results: [],
    cleanupWarnings: [],
  };
  try {
    for (const scenario of selected) {
      const result = {
        id: scenario.id,
        title: scenario.title,
        protocols: scenario.protocols,
        status: "inconclusive",
        trace: [],
      };
      const start = performance.now(),
        traceStart = a.trace.length;
      if (
        config.profile === "s3" &&
        scenario.protocols.some((p) => p !== "s3")
      ) {
        result.status = "unsupported";
        result.reason =
          "The selected S3-only profile does not expose Supabase REST/TUS.";
      } else {
        try {
          await scenario.run(
            a,
            `doctor/${runId}/${scenario.id}`,
            payload(config.seed),
          );
          result.status = "passed";
          result.reason = "All scenario assertions passed.";
        } catch (error) {
          if (error instanceof CheckFailure) {
            result.status = "failed";
            result.reason = error.message;
          } else if (
            error instanceof ObservationError &&
            error.status >= 400 &&
            error.status < 500 &&
            ![401, 403, 408, 429].includes(error.status)
          ) {
            result.status = "failed";
            result.reason = `Expected operation returned HTTP ${error.status}; inspect configuration and protocol semantics before classifying a defect.`;
          } else {
            result.status = "inconclusive";
            result.reason =
              error instanceof ObservationError
                ? `Request could not be evaluated reliably (HTTP ${error.status || "unavailable"}). Check target availability, credentials and logs.`
                : "Harness could not complete this scenario. No target defect is established.";
          }
        }
      }
      result.ms = Math.round(performance.now() - start);
      result.trace = a.trace.slice(traceStart);
      report.results.push(result);
    }
  } finally {
    report.cleanupWarnings = await a.cleanup();
  }
  report.finishedAt = new Date().toISOString();
  report.summary = Object.fromEntries(
    ["passed", "failed", "unsupported", "skipped", "inconclusive"].map((s) => [
      s,
      report.results.filter((r) => r.status === s).length,
    ]),
  );
  report.exitCode =
    report.cleanupWarnings.length || report.summary.inconclusive
      ? 2
      : report.summary.failed
        ? 1
        : 0;
  return report;
}
