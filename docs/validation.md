# Validation record

2026-10-28. Local macOS arm64, Node v24.21.0, Supabase CLI 2.122.0.

## Live target

- Dedicated CLI project `storage-doctor`, API on `127.0.0.1:55431`.
- Supabase Storage image `public.ecr.aws/supabase/storage-api:v1.84.19`.
- Downloaded storage image repository digest: `sha256:a0420573837ee08c0afdc9cd01f90b4b8027579da99e0b9a159fe912ef756c99`.
- PostgreSQL image `public.ecr.aws/supabase/postgres:17.11.0.006`.
- Upstream source checkout inspected separately at `3bbc971796fe9907a030c4fc70a07d440930d7b2`; this is **not** claimed to be the image source SHA.
- Private unique bucket, local privileged credentials and filesystem-backed Storage via the CLI stack.

The initial live run passed nine checks and rejected the composite Unicode/percent filename with HTTP 400. Investigation of [documented filename restrictions](https://supabase.com/docs/guides/storage/uploads/file-limits) showed the assertion expected behavior outside the supported character set. The test assumption was corrected to supported spaces and URL-sensitive ASCII characters. The original report remains locally in `reports/initial-contract-review/report.json`; it is not a confirmed finding.

Two corrected live runs against separate fresh buckets each passed **10/10** scenarios with **zero cleanup warnings**, including the 6 MiB TUS chunk followed by offset query, final PATCH and byte comparison through REST and S3. Structured evidence is generated locally at `reports/integration/report.json`; Markdown, offline HTML and SHA-256 checksums are beside it. Reports are ignored by Git by default.

A sanitized snapshot of the second live run is included at [examples/verified-supabase/report.json](../examples/verified-supabase/report.json), with its HTML/Markdown report and checksums. Run IDs differ between repetitions; payload seed and target version agree. The first successful run is retained locally in `reports/verified-run-1/report.json`.

## Harness verification

The final harness suite passed **10/10 tests**. Wire-level fixture checks validate clean roundtrips, corrupted-byte detection, authorization uncertainty, cleanup failures, profile exclusions and malicious TUS resource locations. Configuration tests reject external destinations and URL credentials. Export tests preserve original observations and generate a replay recipe. A budget test prevents new exploration requests while permitting cleanup.

The fixture deliberately does not validate SigV4 signatures, emulate PostgreSQL, enforce RLS or stand in for Supabase. Live integration is separate evidence.

The first sandboxed test attempt could not bind a loopback socket (`EPERM`). The same suite was run outside that restriction, using only ephemeral local HTTP ports. This was an environment restriction, not a target failure.

## What is not established

- No new vendor bug or security issue is confirmed.
- No upstream maintainer has reviewed or adopted Storage Doctor.
- No production performance or end-user RLS guarantees were tested.
- No other S3 implementation or operating system is verified yet.
- GitHub Actions definitions exist; remote CI has not been run.
- No independent external reproduction or validated user demand exists yet.
- No hidden-evaluation result or measurable self-improvement is claimed.
- The HTML artifact has rendering/escaping checks in the harness; native browser inspection was blocked by the browser's local-file URL policy.

Re-run all commands from README to generate fresh observations. Ten passing scenarios establish only those specific checks under the recorded configuration.

## 0.2.0 upgrade verification

The baseline was independently re-run before edits on Node v24.21.0 / npm 12.1.0 / macOS arm64 with Supabase CLI 2.122.0: ten harness tests and the original package smoke passed.

The upgraded local suite passes **22 tests**, including **12 independently authored security regressions**. Separate review reproduced the baseline ambient-proxy canary and verified the fix using only loopback traffic and generated credentials. Tests cover oversized error XML before SDK parsing, stalled bodies, hostile/nested report fields, symlinks, tampering, cancellation and concurrent ownership. No unresolved critical finding remains in reviewed paths.

Two upgraded all-scenario runs against Supabase Storage v1.84.19 each passed **10/10**, with no cleanup warnings. The latest source-fingerprinted snapshot is retained in [examples/v0.2.0](../examples/v0.2.0/report.json); old schema 1 evidence is untouched.

Both the integrated smoke and an independent fresh offline consumer executed doctor/list/check/report/export/verify/plan through the installed binary. The independent consumer's core fixture checks passed 3/3; fixtures are not vendor compatibility evidence. Local full CLI package smoke also exercised JSON and quiet output.

A real-run rest-to-s3 bundle was exported and its five evidence files verified. Named replay against a fresh dedicated local bucket is recorded in the upgrade logs; it is not proof of an independent upstream finding.

Pattern scan and manual review covered all 31 historical blobs plus the tracked candidate before initial push, with no credential findings. Pattern scanning is not an assurance against every possible secret representation. A dependency audit returned zero reported production vulnerabilities at the time of the check; this is registry evidence, not a complete security assessment.

Five local help-start samples varied between 102 and 1749 ms; five HTML-render samples varied between 0.106 and 0.666 ms on this busy host. This small noisy sample does not justify a speed claim or architecture change. Parent RSS was about 74 MB, not measured child peak memory. The packed artifact size from the clean-consumer check was about 43 KB before final documentation updates; exact release size is recorded by the final package check.

Remaining limitations: external developer demand unvalidated; no hostile-kernel/tunnel protection; no production/RLS/load/crash-recovery coverage; no other provider validation; HTML has semantic/escaping checks but no independent visual/accessibility certification. Remote CI and Action status are recorded separately in [release readiness](release.md).

### Remote Linux validation

[Service and composite Action run 40754252153](https://github.com/phlppgdfry/storage-doctor/actions/runs/40754252153) passed on Linux/x64: all ten real Supabase scenarios, a three-check core Action run, exact owned-resource cleanup and artifact upload. The checked-in 0.2.0 snapshot now comes from that run; its source fingerprint was compared to the local candidate and matched. The prior macOS snapshots remain in local upgrade evidence.

The initial [fast CI run](https://github.com/phlppgdfry/storage-doctor/actions/runs/40753324276) failed its Node 24 offline-consumer step with ENOTCACHED: npm ci had cached package archives without the metadata a fresh install resolution expected. The smoke now constructs a consumer lockfile from the audited dependency graph and uses npm ci --offline; it does not drop offline validation. Local replay of that fixed consumer passed. Follow-up remote fast-CI evidence is recorded in release.md.

A direct IPv6 loopback request also passed on macOS. Cross-platform browser visual inspection remains unverified; no accessibility certification is claimed.
