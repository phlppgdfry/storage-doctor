import { randomUUID, createHash } from "node:crypto";
import {
  Adapter,
  CheckFailure,
  ObservationError,
  BudgetError,
} from "./adapter.js";
import { publicConfig, validateConfig } from "./config.js";
import { scenarios, payload } from "./scenarios.js";
import { sourceFingerprint } from "./fingerprint.js";
import { VERSION, SCHEMA_VERSION } from "./version.js";

export const packs = {
  core: ["s3-roundtrip", "s3-empty", "s3-metadata"],
  s3: scenarios.filter((s) => s.protocols.length === 1).map((s) => s.id),
  "cross-protocol": scenarios
    .filter((s) => s.protocols.length > 1)
    .map((s) => s.id),
  tus: ["tus-resume-cross"],
  all: scenarios.map((s) => s.id),
};
export function selectScenarios({ only, pack = "all" } = {}) {
  if (!Object.hasOwn(packs, pack))
    throw new Error(
      "Unknown pack. Choose all, core, s3, cross-protocol or tus.",
    );
  const selected = scenarios.filter(
    (s) => packs[pack].includes(s.id) && (!only || s.id === only),
  );
  if (!selected.length)
    throw new Error(
      "Unknown scenario or scenario outside selected pack. Use list.",
    );
  return selected;
}
export function summarize(results, warnings = []) {
  const summary = Object.fromEntries(
    ["passed", "failed", "unsupported", "skipped", "inconclusive", "error"].map(
      (status) => [status, results.filter((r) => r.status === status).length],
    ),
  );
  return {
    summary,
    exitCode:
      warnings.length ||
      summary.error ||
      summary.inconclusive ||
      summary.skipped
        ? 2
        : summary.failed
          ? 1
          : 0,
  };
}
export async function run(
  config,
  { only, pack = "all", adapter, mode = "live", signal } = {},
) {
  config = validateConfig(config);
  const selected = selectScenarios({ only, pack }),
    runId = randomUUID(),
    a = adapter || new Adapter(config);
  a.scope(runId, signal);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(publicConfig(config)))
    .digest("hex");
  const report = {
    schemaVersion: SCHEMA_VERSION,
    toolVersion: VERSION,
    sourceFingerprint: await sourceFingerprint(),
    runId,
    mode,
    startedAt: new Date().toISOString(),
    nodeVersion: process.version,
    platform: `${process.platform}/${process.arch}`,
    config: publicConfig(config),
    environmentFingerprint: fingerprint,
    budget: {
      maxScenarios: 10,
      maxRequests: 80,
      explorationDeadlineMs: 120000,
      maxResponseBytes: 8388608,
      cleanupDeadlineMs: 30000,
    },
    payloadSha256: createHash("sha256")
      .update(payload(config.seed))
      .digest("hex"),
    results: [],
    cleanupWarnings: [],
  };
  let exhausted = false;
  try {
    for (const scenario of selected) {
      const result = {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        protocols: scenario.protocols,
        prerequisites: scenario.prerequisites,
        expected: scenario.expected,
        reference: scenario.reference,
        status: "inconclusive",
        reason: "",
        reasonCode: "unavailable",
        ms: 0,
        trace: [],
        cleanup: { status: "not-needed", warnings: [] },
        reproduction: { seed: config.seed, scenario: scenario.id },
        environmentFingerprint: fingerprint,
      };
      const start = performance.now(),
        traceStart = a.trace.length;
      if (exhausted || signal?.aborted) {
        result.status = "skipped";
        result.reasonCode = "budget";
        result.reason =
          "Not executed: campaign cancelled or exploration budget exhausted.";
      } else if (
        config.profile === "s3" &&
        scenario.protocols.some((p) => p !== "s3")
      ) {
        result.status = "unsupported";
        result.reasonCode = "profile";
        result.reason =
          "The S3-only profile excludes Supabase REST/TUS; no provider capability claim is made.";
      } else {
        try {
          await scenario.run(
            a,
            `doctor/${runId}/${scenario.id}`,
            payload(config.seed),
          );
          result.status = "passed";
          result.reasonCode = "assertions";
          result.reason = "All scenario assertions passed.";
        } catch (error) {
          if (error instanceof BudgetError) {
            exhausted = true;
            result.reasonCode = "budget";
            result.reason =
              "Exploration stopped at its request, time or cancellation boundary.";
          } else if (error instanceof CheckFailure) {
            result.status = "failed";
            result.reasonCode = "assertion";
            result.reason = error.message;
          } else if (error instanceof ObservationError) {
            result.status =
              error.status >= 400 &&
              error.status < 500 &&
              ![401, 403, 408, 429].includes(error.status)
                ? "failed"
                : "inconclusive";
            result.reasonCode = "observation";
            result.reason = `Operation could not satisfy the contract (HTTP ${error.status || "unavailable"}; ${error.code}). Check target configuration and protocol semantics before claiming a defect.`;
          } else {
            result.status = "error";
            result.reasonCode = "harness";
            result.reason =
              "The diagnostic harness encountered an unexpected error. No target defect is established.";
          }
        } finally {
          result.ms = Math.round(performance.now() - start);
          result.trace = a.trace.slice(traceStart);
          const cleanupStart = a.trace.length;
          result.cleanup.warnings = await a.cleanup();
          result.cleanup.status = result.cleanup.warnings.length
            ? "failed"
            : "passed";
          result.cleanup.trace = a.trace.slice(cleanupStart);
          report.cleanupWarnings.push(...result.cleanup.warnings);
        }
      }
      report.results.push(result);
    }
  } finally {
    a.close();
  }
  report.finishedAt = new Date().toISOString();
  Object.assign(report, summarize(report.results, report.cleanupWarnings));
  return report;
}
