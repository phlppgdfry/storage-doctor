import { isDeepStrictEqual } from "node:util";
import { validateReport } from "./schema.js";

// This compares evidence, never replays requests or certifies a target defect.
export function compareReports(baselineInput, currentInput) {
  const baseline = validateReport(baselineInput);
  const current = validateReport(currentInput);
  const blockers = [];
  const same = (field, a, b) => {
    if (!isDeepStrictEqual(a, b)) blockers.push(field);
  };
  if (
    baseline.schemaVersion !== current.schemaVersion ||
    baseline.sourceSchemaVersion !== current.sourceSchemaVersion
  )
    blockers.push("source schema provenance");
  same(
    "config.authContext",
    baseline.config.authContext,
    current.config.authContext,
  );
  if (
    baseline.mode === "live" &&
    (!baseline.config.authContext ||
      baseline.config.authContext === "unrecorded" ||
      !current.config.authContext ||
      current.config.authContext === "unrecorded")
  )
    blockers.push(
      "live authentication context must be explicitly recorded with SD_AUTH_CONTEXT",
    );
  if (
    !baseline.environmentFingerprint ||
    baseline.environmentFingerprint === "unrecorded" ||
    !current.environmentFingerprint ||
    current.environmentFingerprint === "unrecorded"
  )
    blockers.push("environment fingerprint: unrecorded");
  same("mode", baseline.mode, current.mode);
  same("toolVersion", baseline.toolVersion, current.toolVersion);
  if (!baseline.sourceFingerprint || !current.sourceFingerprint)
    blockers.push("sourceFingerprint: unrecorded");
  else
    same(
      "sourceFingerprint",
      baseline.sourceFingerprint,
      current.sourceFingerprint,
    );
  for (const field of ["profile", "seed", "timeoutMs", "region"])
    same(`config.${field}`, baseline.config[field], current.config[field]);
  same("payloadSha256", baseline.payloadSha256, current.payloadSha256);
  if (!baseline.budget || !current.budget) blockers.push("budget: unrecorded");
  else same("budget", baseline.budget, current.budget);
  const ids = (r) => r.results.map((x) => x.id).sort();
  same("scenario selection", ids(baseline), ids(current));
  if (
    baseline.exitCode !== 0 ||
    baseline.results.some(
      (r) =>
        r.status !== "passed" ||
        !["passed", "not-needed"].includes(r.cleanup.status),
    )
  )
    blockers.push(
      "baseline must contain only passed checks with recorded successful cleanup",
    );

  const changes = baseline.results
    .map((before) => {
      const after = current.results.find((r) => r.id === before.id);
      return {
        id: before.id,
        before: before.status,
        after: after?.status || "missing",
      };
    })
    .filter((x) => x.before !== x.after);
  const incomplete =
    current.exitCode === 2 ||
    current.results.some(
      (r) =>
        !["passed", "failed"].includes(r.status) ||
        !["passed", "not-needed"].includes(r.cleanup.status),
    );
  const regressions = blockers.length
    ? []
    : changes.filter((x) => x.before === "passed" && x.after === "failed");
  const exitCode =
    blockers.length || incomplete ? 2 : regressions.length ? 1 : 0;
  return {
    comparisonVersion: 1,
    baselineRunId: baseline.runId,
    currentRunId: current.runId,
    mode: current.mode,
    comparable: !blockers.length,
    outcome: blockers.length
      ? "not-comparable"
      : incomplete
        ? "incomplete"
        : regressions.length
          ? "regression"
          : "no-regression",
    blockers,
    changes,
    regressions,
    targetVersions: {
      baseline: baseline.config.targetVersion,
      current: current.config.targetVersion,
    },
    exitCode,
    limitations:
      "Status comparison only. Target versions, local endpoints and bucket identities may differ. Timing, request traces and credentials are not compared. Authentication context is user-declared, not a permission attestation. Matching declared inputs do not prove equivalent environments or a target defect. Fixture evidence remains fixture evidence.",
    nextStep:
      exitCode === 0
        ? "Retain both reports and their checksum manifests."
        : "Inspect both reports, verify bundle integrity, and reproduce changed checks with the recorded seed before claiming a defect.",
  };
}
