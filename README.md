# Storage Doctor

**Trust the bytes. Inspect the evidence.**

Local object storage diagnostics across **Supabase REST, S3 and TUS**, with portable evidence reports.

Upload through one protocol, read through another, compare exact bytes, and inspect the request sequence. No AI key, cloud account or hosted service is required.

**Verified locally:** ten scenarios passed twice against Supabase Storage v1.84.19; ten harness tests passed. [Inspect the recorded run](examples/verified-supabase/report.md).

Early local-first CLI, version 0.1.0. Independent project; not affiliated with Supabase. **Not published to npm.** Do not use `npx storage-doctor` until an official package has been published and its ownership verified.

## Try the report in one command

Requires Node 22+ (tested on Node 24).

```sh
npm ci
npm run demo
open reports/demo/report.html
```

The demo starts a temporary loopback HTTP protocol fixture. It exercises all ten scenarios and produces a real report of **fixture behavior**. It is not a Supabase server and does not establish storage-engine compatibility. No fixtures are silently substituted during live checks.

To watch the detector catch corrupted bytes:

```sh
npm run demo -- --inject-corruption
```

That intentionally exits nonzero and replaces the demo report. This is a controlled test of the harness, not a discovered storage bug.

## Test a real local Supabase engine

Requirements: Docker and Supabase CLI. The checked-in configuration uses a separate project ID and ports 55431/55432.

```sh
supabase start -x realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
npm run integration
open reports/integration/report.html
```

The integration script reads credentials from this project's `supabase status` in memory, creates a unique private test bucket, runs ten scenarios, removes its own objects, and deletes the bucket. It records the storage image version. It does not load credentials from another repository.

Stop only this project's stack when finished:

```sh
supabase stop
```

The CLI version controls the container image versions. Record and use the tested CLI version in [validation](docs/validation.md) for repeatability. GitHub's optional integration workflow is manual and records its actual target image; it is not proof that CI has already run.

## Bring an existing local test target

Create a dedicated empty bucket named `storage-doctor-*` or `sd-*`, then configure environment variables as in [examples/local.env.example](examples/local.env.example). Tokens must have permissions for the scenarios. The integration helper uses a local service-role token; this does not test end-user RLS boundaries.

```sh
node --env-file=.env src/cli.js check --local
node --env-file=.env src/cli.js check --local --only rest-to-s3 --out reports/retest --ci
node src/cli.js list
```

Only literal `127.0.0.1` and `[::1]` endpoints are accepted. Remote/cloud targets are deliberately outside this release. `--local` is required. HTTP redirects are rejected; a TUS Location must remain inside the configured TUS endpoint. Each run owns a UUID-prefixed object namespace and deletes only exact keys it created. It never empties a bucket.

For a local S3-only implementation, use `SD_PROFILE=s3`. Five S3 scenarios run; REST/TUS scenarios are explicitly reported as unsupported **by that profile**. No AWS, MinIO or other vendor compatibility claim follows from that configuration alone.

## Ten initial scenarios

| Scenario            | What it verifies                                                           |
| ------------------- | -------------------------------------------------------------------------- |
| `s3-roundtrip`      | Exact binary bytes survive upload/download                                 |
| `s3-empty`          | Zero-byte object survives roundtrip                                        |
| `s3-path`           | Allowed spaces, `+`, `?`, `&` and `=` survive key encoding                 |
| `s3-range`          | Byte slice, HTTP 206 and Content-Range agree                               |
| `s3-metadata`       | Content type, user metadata and byte length agree                          |
| `rest-to-s3`        | REST-uploaded bytes are readable through S3                                |
| `s3-to-rest`        | S3-uploaded bytes are readable through REST                                |
| `rest-overwrite-s3` | REST upsert replaces bytes visible through S3                              |
| `s3-delete-rest`    | S3 deletion is reflected in a REST read                                    |
| `tus-resume-cross`  | Stored TUS offset permits a second PATCH; final bytes agree across REST/S3 |

The TUS case uses a 6 MiB first chunk and a small final chunk. It checks offset-based continuation across requests, not socket interruption, concurrent resume or crash recovery.

## Read and share evidence

Every run produces:

```text
report.json       Structured observations and environment identity
report.md         Reviewable summary
report.html       Self-contained report with expandable request traces
checksums.json    SHA-256 hashes of those files
```

Reports include status codes and diagnostic timings, but exclude request headers, object bodies, service responses and credentials. Review local URLs, target versions and bucket identifiers before sharing. Checksums detect accidental changes; they are not signatures or an external trust guarantee.

```sh
node src/cli.js export rest-to-s3 --report reports/integration/report.json --out reports/finding
node src/cli.js plan --report reports/integration/report.json
```

`export` includes the original report, a focused report and a replay recipe. It needs a separately provisioned target and credentials; it is not a self-contained server image or automatically minimized reproduction.

`plan` suggests one next scenario, prioritizing failed and inconclusive results. This is an auditable deterministic heuristic. It does not execute anything, alter its evaluator or claim demonstrated self-improvement.

| Status       | Meaning                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------- |
| passed       | All assertions in this scenario passed in this run                                                  |
| failed       | Assertion disagreed or an expected operation was rejected; investigate before claiming a target bug |
| unsupported  | Selected profile intentionally excludes the required protocols                                      |
| skipped      | Reserved for future explicit selection/budget skips; not used to hide errors                        |
| inconclusive | Availability, authorization, throttling or harness failure prevents a reliable conclusion           |

Exit codes: **0** evaluated checks pass; **1** scenario failure; **2** configuration/incomplete evaluation/cleanup failure. Unsupported scenarios are listed and do not fail an S3-only run. There is no aggregate “S3 compatibility score.”

## Development and CI

```sh
npm test
npm run verify
npm pack --dry-run
npm run package:smoke
```

Tests exercise actual HTTP requests through the AWS SDK plus REST/TUS clients, seeded payloads, corruption detection, authorization classification, cleanup ownership, redirect constraints, evidence export and CLI errors. The fixture does not implement signature verification; live integration supplies the real authentication check.

[Verify workflow](.github/workflows/verify.yml) runs the harness and fixture demo. [Manual integration workflow](.github/workflows/local-engine.yml) starts an isolated real Supabase instance. Request timings are not performance benchmarks.

## Why this project exists

This project focuses on a short cross-protocol diagnosis and evidence workflow. It does not replace S3 compatibility suites, load generators or Supabase's own tests. Existing tools and product assumptions are documented in [product validation](docs/product-validation.md).

- [Architecture and protocol contracts](docs/architecture.md)
- [Validation and observed results](docs/validation.md)
- [Scope, stop criteria and roadmap](docs/roadmap.md)
- [Contribution guidelines](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

No confirmed new Supabase defect, upstream adoption or performance improvement is claimed. Optional AI investigation, fault injection, sequence shrinking and adaptive strategy evaluation remain future work, gated on evidence that the basic workflow helps developers.
