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
