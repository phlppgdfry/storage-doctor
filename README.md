# Storage Doctor

**Trust the bytes. Inspect the evidence.**

Diagnose a disposable **local Supabase Storage** target through REST, S3 and TUS. Verify exact bytes across APIs, understand failed checks, and export reviewable evidence without an AI key.

For self-hosting developers, integration-test authors and storage investigators. Ten focused scenarios; no universal compatibility score, cloud scanning or load generator. Independent project, not affiliated with Supabase.

## See it in a minute

```sh
git clone https://github.com/phlppgdfry/storage-doctor.git
cd storage-doctor
npm ci
npm run demo
```

The command prints a new `reports/demo-UUID/report.html` path. Open that standalone file in a browser. **The demo uses a temporary protocol fixture, not Supabase.** To see a controlled corruption failure: `npm run demo -- --inject-corruption` (expected nonzero exit).

[Inspect the current real Supabase run](examples/v0.2.0/report.md) · [Current validation](docs/validation.md) · [Security model](SECURITY.md)

## Run against a real engine

Requires Node **22 or 24**, Docker and Supabase CLI **2.122.0** for the supplied stack. No npm package has been published: use the checkout, or install an artifact you have packed and reviewed. Do not assume `npx storage-doctor` belongs to this project.

```sh
supabase start -x realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
npm run integration
supabase stop
```

This starts only project `storage-doctor` on ports 55431/55432. The helper reads its local credentials in memory, creates a unique private test bucket, runs the diagnostics, removes its objects and deletes only that bucket. It prints the report directory. A failed bucket deletion never triggers an empty-bucket operation.

For an existing disposable target, create a dedicated `sd-*` or `storage-doctor-*` bucket and fill an ignored `.env` from [the example](examples/local.env.example):

```sh
node --env-file=.env src/cli.js doctor
node --env-file=.env src/cli.js check --local --pack core
node --env-file=.env src/cli.js check --local --only rest-to-s3 --json
```

`doctor` validates configuration without contacting storage. `check` requires credentials that can write, read and delete its test objects; it never creates or deletes buckets. See [configuration, permissions and troubleshooting](docs/configuration.md).

## Safety before features

- Literal `127.0.0.1` / `[::1]` endpoints only; DNS names and remote/cloud targets are rejected.
- Direct sockets bypass ambient proxies, refuse redirects and check the connected address. TLS validation stays enabled.
- UUID namespaces isolate concurrent runs; mutation and cleanup enforce owned keys.
- Sequential checks, one attempt, 8 MiB request/response limits, 80 exploration requests, 120-second exploration deadline and 30-second aggregate cleanup allowance.
- SIGINT/SIGTERM cancel exploration while cleanup remains possible. Force-kill, crashes or unreachable targets can still leave disposable resources; cleanup warnings must be reviewed.
- Reports omit credentials, headers and response bodies. Imports are bounded and validated. New output directories are required; existing evidence is never overwritten.

Loopback can still tunnel to production. Do not configure such a tunnel. Privileged integration credentials do not establish end-user RLS isolation.

## What is tested?

| Pack             | Checks                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `core`           | Binary roundtrip, empty object, S3 metadata/size                                          |
| `s3`             | Core plus URL-sensitive supported keys and range reads                                    |
| `cross-protocol` | REST→S3, S3→REST, overwrite visibility, deletion visibility, completed TUS bytes          |
| `tus`            | Create, offsets, resume, wrong-offset rejection, unchanged offset and final REST/S3 bytes |
| `all`            | All ten scenarios; default                                                                |

These are built-in selectors, not third-party plugins. `SD_PROFILE=s3` excludes Supabase-only protocols and reports them as UNSUPPORTED by the profile. This alone does not establish another vendor's compatibility.

```sh
node src/cli.js list --pack cross-protocol --json
```

TUS uses a 6 MiB first chunk. It tests continuation across requests and a rejected duplicate offset, **not** mid-socket interruption, concurrency, server restart or crash recovery. Metadata coverage is S3 HEAD, not a universal mapping between protocol schemas. [Contracts and scenario design](docs/architecture.md).

## Understand the output

The shipped real-run snapshot records ten passing scenarios; current upgrade evidence and limitations are in [validation](docs/validation.md).

```text
PASS          rest-to-s3
  All scenario assertions passed.
```

| Status       | Meaning                                                                        |
| ------------ | ------------------------------------------------------------------------------ |
| PASS         | All scenario assertions passed in this run                                     |
| FAIL         | An expected contract disagreed; investigate before claiming a target defect    |
| UNSUPPORTED  | Selected profile excludes required protocols                                   |
| SKIPPED      | Not executed after cancellation/budget exhaustion                              |
| INCONCLUSIVE | Availability, authorization, timeout or budget prevented a reliable conclusion |
| ERROR        | Unexpected harness failure, not a vendor finding                               |

Exit **0**: evaluated checks pass. **1**: failed diagnostic. **2**: setup/harness/incomplete evaluation or cleanup problem. `--json` emits one JSON value; `--quiet` suppresses successful output; `--ci` is noninteractive. Failures are never silently reclassified as unsupported features.

## Share evidence, then replay

Every run writes JSON, Markdown, offline HTML and SHA-256 checksums. HTML includes environment, status breakdown, expected/observed behavior, request traces, replay guidance and cleanup outcomes. It needs no external assets or JavaScript.

```sh
node src/cli.js export rest-to-s3 --report RUN/report.json --out NEW_BUNDLE
node src/cli.js verify --report NEW_BUNDLE
node src/cli.js report --report RUN/report.json --out NEW_RENDER
node src/cli.js plan --report RUN/report.json
```

The bundle contains a focused result, normalized original observations and a replay recipe. All five evidence files are hashed. Schema 1 history is read through an explicit validated conversion; new reports use schema 2. Source-code fingerprints help distinguish builds. Checksums are integrity checks, not signatures. Review local identifiers before sharing.

A replay still needs a separately provisioned engine and private credentials. No novel Supabase defect or independent upstream reproduction is claimed. `plan` is a fixed retest heuristic; it does not demonstrate self-improvement. [Report format and replay](docs/report-format.md).

## CI and GitHub Action

Fast CI checks Node 22/24, formatting, syntax, local fixtures and a clean offline package installation. A separate manual workflow starts real Supabase services. Expensive reliability campaigns are not run on every PR.

The repository includes a composite [GitHub Action](action.yml). It expects an **already provisioned disposable loopback target** and `SD_*` credentials supplied by your workflow; it does not set up storage or authorize a remote target:

```yaml
- uses: phlppgdfry/storage-doctor@v0.2.0
  with:
    profile: supabase
    pack: core
  env:
    SD_BUCKET: sd-ci-test
    # Supply the other documented SD_* values securely in your local-service job.
```

Pin the reviewed release commit in production workflows. The Action runs the CLI and uploads evidence as an artifact; respect your organization's artifact policy. Its remote validation status is recorded in [release readiness](docs/release.md).

## Development

```sh
npm run verify
npm run package:smoke
```

The wire fixture deliberately does not verify SigV4 or emulate PostgreSQL. Security tests cover proxy isolation, oversized/error responses, stalls, malicious report imports, symlinks, ownership, cancellation and concurrent runs. The installed-package smoke executes every advertised command against a clearly labelled fixture.

[Contributing](CONTRIBUTING.md) · [Architecture](docs/architecture.md) · [Audit](docs/upgrade-audit.md) · [Release gates](docs/release.md) · [Changelog](CHANGELOG.md) · [Roadmap](docs/roadmap.md)

Existing tools already cover broad S3 compatibility and benchmarking. Our focus is a short local cross-protocol diagnosis with portable evidence; [comparison and demand assumptions](docs/product-validation.md). Optional AI explanations, adaptive research, shrinking and more providers remain roadmap items. No hidden telemetry or mandatory paid API.

MIT licensed. To report a suspected vulnerability, use the private route in [SECURITY.md](SECURITY.md), not a public issue.
