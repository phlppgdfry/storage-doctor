# Storage Doctor

**Did a local storage change break the bytes—or just your test setup?**

Storage Doctor runs ten bounded checks across **Supabase REST, S3 and TUS**, records exact-byte assertions and cleanup outcomes, and compares two runs without turning missing evidence into a green result. Use it to investigate a local integration or check a storage upgrade before considering production changes.

Independent, local-first and offline-reporting. No cloud targets, telemetry or AI key. Existing broad S3 suites and load generators solve different problems; [scope and alternatives](docs/product-validation.md).

**Version status:** this is a **v0.3.0 candidate**. No v0.3.0 tag or npm package is published. Use this reviewed candidate checkout or its exact reviewed archive; the public default branch can still contain v0.2.0 until an approved merge. [Current release gates](docs/release.md).

## Try it safely

From the candidate checkout, with **Node 22 or 24**:

```sh
npm ci
node src/cli.js demo
```

Open the printed `report.html` path. This starts a temporary loopback **protocol fixture**, uses synthetic credentials and stops it afterward. It needs no Docker or storage account. **It does not test Supabase or establish vendor compatibility.**

After installing a reviewed tarball in a separate directory, use `node_modules/.bin/storage-doctor demo`. Do not assume `npx storage-doctor` belongs to this project. [Installation validation](docs/validation.md).

## See a regression and reproduce it

Use fresh output directories. The second and third commands below **intentionally exit 1**:

```sh
node src/cli.js demo --out reports/good
node src/cli.js demo --inject-corruption --out reports/bad
node src/cli.js compare --baseline reports/good/report.json --report reports/bad/report.json
node src/cli.js export rest-to-s3 --report reports/bad/report.json --out reports/reproduction
node src/cli.js verify --report reports/reproduction
```

The same validated engine generates both fixture runs. Comparison verifies the complete checksum bundles before classifying PASS→FAIL. Export retains expected/observed behavior, traces, seed and a reproduction recipe. Repeat the first three commands with new directories to reproduce the injected failure. A fixture disagreement is not a newly discovered storage defect.

For a genuine timed terminal capture, run `npm run demo:record` from the checkout. It executes these commands, checks actual exits and retains a roughly 45-second `.cast`, transcript and original evidence under a new `reports/showcase-*` directory. No screenshots or fictional output are generated. [Actual recording](examples/showcase/regression.cast) · [Readable transcript](examples/showcase/transcript.txt) · [Capture metadata](examples/showcase/recording.json).

## Compare two real local runs

The supplied disposable stack requires Docker and **Supabase CLI 2.122.0**:

```sh
supabase start -x realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
npm run integration
# Keep the first printed report directory as BASELINE.
# Apply the intended change to this disposable local target, or repeat unchanged.
npm run integration
# Keep the second printed report directory as CURRENT.
node src/cli.js compare --baseline BASELINE/report.json --report CURRENT/report.json --json
supabase stop
```

Replace `BASELINE` and `CURRENT` with the actual printed paths. The helper reads credentials in memory, creates a unique private bucket, executes the checks, removes its exact objects and deletes only that bucket. It uses ports **55431/55432** and a declared `local-service-role` authentication context. A failed bucket deletion never triggers bucket-wide emptying. No target-change automation is implied.

For your own disposable target, start with [the environment example](examples/local.env.example), provision a dedicated `sd-*` or `storage-doctor-*` bucket, then run:

```sh
node --env-file=.env src/cli.js doctor
node --env-file=.env src/cli.js check --local --pack core
```

`doctor` is a non-network configuration check. Credentials must permit the selected reads, writes and exact object deletes. Set `SD_AUTH_CONTEXT` to a non-secret policy/role label before recording live baselines; change the label whenever effective permissions change. The label is user-declared, **not an authorization attestation**. [Configuration and troubleshooting](docs/configuration.md).

## Read the evidence

[Real Supabase snapshot](examples/v0.3.0-rc2/report.md) · [Exact verification evidence](docs/validation.md) · [Report and comparison contracts](docs/report-format.md)

| Diagnostic status | Meaning                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| PASS              | Executed assertions passed in this run                                           |
| FAIL              | Contract disagreement; investigate setup and semantics before blaming the target |
| INCONCLUSIVE      | Availability, authorization, timeout or budget prevented a conclusion            |
| UNSUPPORTED       | Selected profile excludes required protocols                                     |
| SKIPPED / ERROR   | Incomplete evaluation / harness error                                            |

Comparison requires a healthy baseline, the same diagnostic source/version, mode, scenario set, payload, seed, profile, region, timeout, budgets and declared auth context. Target versions may differ and are reported. Scenario order, durations, endpoint and bucket identities do not drive regression classification.

| Comparison exit | Meaning                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------- |
| **0**           | Valid comparable checks remain passing                                                    |
| **1**           | Previously passing checks now fail; no root cause is established                          |
| **2**           | Lost assurance, invalid/incomparable evidence, unsuitable baseline or cleanup uncertainty |

FAIL→PASS is not accepted as a healthy-baseline comparison. Fixture/live, missing scenarios, unknown schemas, missing manifests and checksum mismatches cannot return a successful comparison. An attacker who rewrites both evidence and its manifest can forge integrity: **checksums do not prove authenticity**.

Each run writes validated JSON, Markdown, standalone HTML and SHA-256 checksums. HTML needs no JavaScript or external assets. New output directories are required; existing evidence is not overwritten. `--json` emits one JSON value; `--quiet` suppresses successful output. Other commands: `list`, `report`, `export`, `verify` and the fixed heuristic `plan`. See `--help`.

## Integrate into CI

The composite [GitHub Action](action.yml) expects an already provisioned disposable loopback target and `SD_*` credentials. It runs checks, optionally compares a trusted baseline, writes a concise job summary and uploads evidence. It does not provision storage or authorize remote targets.

Use the [separate-consumer workflow](examples/consumer-workflow.yml) with an **actual reviewed 40-character commit SHA** after authorized publication. No fictitious v0.3.0 reference is provided. The existing v0.2.0 tag predates the baseline/summary additions. Local shell-consumer tests and hosted GitHub execution are separate evidence; see [current gates](docs/release.md).

```sh
npm run verify
npm run package:smoke
npm run package:offline # Empty consumer; prewarmed dependency cache, no npm network
npm run package:fresh   # Empty private cache; registry access required
npm run action:smoke
```

The normal smoke uses the locked graph and `--prefer-offline`; it may contact npm. [Contributing](CONTRIBUTING.md) explains how to add a focused, source-backed diagnostic without contacting the author.

## Limits and safety

- Only literal `127.0.0.1` / `[::1]` endpoints. Direct sockets bypass ambient proxies, refuse redirects and retain TLS validation. A loopback tunnel to production is still production; do not use one.
- UUID-owned object keys; sequential execution; 80 exploration requests, 120-second campaign, 8 MiB request/response limits and a separate 30-second aggregate cleanup allowance. Cancellation permits cleanup; process death or an unreachable target can leave disposable resources.
- Packs: `core`, `s3`, `cross-protocol`, `tus`, `all`. `SD_PROFILE=s3` excludes REST/TUS; it is not provider capability discovery. [Scenario contracts](docs/architecture.md).
- TUS checks offsets and continuation with a 6 MiB first chunk, not broken sockets, restart or crash recovery. Metadata coverage is S3 HEAD, not universal metadata mapping.
- Verified locally on macOS/arm64; hosted workflows target Linux. Windows execution remains unverified.
- Matching declared inputs does not establish identical permissions, dependencies, topology or configuration. No production/RLS certification, universal S3 compliance, benchmark, upstream endorsement or market validation is claimed.
- AI, automatic shrinking, adaptive research and additional providers remain deferred. `plan` is a fixed retest heuristic, not self-improvement.

[Security/private reporting](SECURITY.md) · [Architecture](docs/architecture.md) · [Changelog](CHANGELOG.md) · [Release process](docs/release.md) · [Roadmap](docs/roadmap.md). MIT licensed.
