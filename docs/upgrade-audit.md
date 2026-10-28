# Upgrade audit

Audit baseline: `b0785f5`, reviewed on 2026-10-28. This records the starting implementation; later fixes do not erase its limitations. Final execution evidence belongs in [validation](validation.md) and the final decision in [release readiness](release.md).

## Baseline inventory

The existing project has ten fixed scenarios, a seeded binary payload, Supabase and S3-only profiles, unique per-run object prefixes, sequential execution, bounded response buffers, per-request timeouts, JSON/Markdown/HTML reports, an evidence exporter, a retest heuristic, a protocol fixture, a real local Supabase integration helper and two CI workflows. It was not recreated.

Its historical live evidence records ten passing checks against Supabase Storage v1.84.19 twice. That evidence is retained as history, not treated as proof that an upgraded build works. The fixture does not implement signature validation, PostgreSQL, RLS, concurrency or crash recovery.

## Priorities and required evidence

| Priority | Starting issue                                                                                                           | Why it matters                                                                            | Resolution criterion                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P0       | REST/TUS use ambient `fetch`; local URL validation alone does not establish proxy-independent routing (`src/adapter.js`) | Credentials must stay on the authorized direct local connection                           | Explicit direct transport, redirect refusal, proxy-isolation tests and real local integration            |
| P0       | Export copies imported JSON verbatim and spreads unknown fields (`src/report.js`)                                        | A hand-edited report can carry secrets or unexpected content into a purported safe bundle | Bounded strict import, deliberate schema compatibility, no arbitrary-field export, malicious-input tests |
| P0       | HTML escapes most strings but interpolates imported summary keys/counts and timing values (`src/report.js`)              | Untrusted report data must not become markup                                              | Validate types and bounds before rendering; escape every dynamic value; regression tests                 |
| P0       | Output writes can overwrite existing files (`src/report.js`)                                                             | Evidence and unrelated files must not be silently replaced                                | Explicit output ownership/overwrite rules and tests for existing destinations and links                  |
| P0       | Cleanup trusts all tracked keys and TUS locations; ownership is a convention (`src/adapter.js`)                          | Future scenarios or API use could enqueue unrelated resources                             | Enforced run ownership, partial-failure and concurrent-run tests, idempotent cleanup                     |
| P1       | Exploration budget is checked between requests, while cleanup is outside its total budget (`src/adapter.js`)             | A slow or stalled target should not extend a campaign indefinitely                        | Absolute request/stream deadlines, separately bounded cleanup, recorded budget outcomes                  |
| P1       | Unknown harness exceptions become inconclusive (`src/runner.js`)                                                         | A broken test is different from uncertainty about the target                              | An ERROR status with safe reason codes and a failing automation exit                                     |
| P1       | Result records omit prerequisites, expected behavior, reproduction parameters and per-scenario cleanup (`src/runner.js`) | A reviewer needs the actual claim and cleanup outcome for each check                      | Versioned result schema with those fields and import tests                                               |
| P1       | `--ci` mixes human lines with JSON; global options can be silently irrelevant (`src/cli.js`)                             | CI users need predictable streams and actionable errors                                   | Clean machine output, quiet mode and command-specific argument validation                                |
| P1       | Configuration errors are discovered only while attempting a run                                                          | Setup mistakes waste time and can confuse target failures with harness failures           | A non-mutating configuration diagnostic and documented permissions                                       |
| P1       | Export provides a replay recipe but no integrity-verification command; hashes cover only selected output files           | A recipient needs to verify the complete bundle before replay                             | Safe manifest verification, tamper tests and an executed replay workflow                                 |
| P1       | CI actions use mutable version tags; package smoke testing is separate from fast CI                                      | Release confidence should include the installed binary and reviewed action revisions      | Immutable action revisions, package installation checks and supported Node matrix                        |
| P1       | Security policy has no valid private reporting route                                                                     | Publishing without a usable channel sends reporters toward public disclosure              | Enable and verify GitHub private vulnerability reporting before launch                                   |
| P2       | Ten scenarios are discoverable only as a flat list                                                                       | Narrow runs can shorten feedback                                                          | Small built-in pack selectors; no dynamic plugin system                                                  |
| P2       | Report lacks an environment overview and explicit limitations near each result                                           | First-time readers need context before interpreting a green result                        | Accessible static report with status text, provenance and replay details                                 |
| P2       | No controlled CLI performance baseline or external usability feedback                                                    | Product value and overhead are not established                                            | Record sample sizes/environment; observe an independent setup; avoid speculative optimization            |

## Protocol assessment

The meaningful core is byte integrity and visibility across APIs. The five S3 controls help distinguish a broken base configuration from a cross-protocol issue. Zero-byte objects, range reads and metadata have different failure surfaces and are not redundant merely because they share upload setup.

Expected behavior must be attached to a source:

- [Supabase interoperability](https://supabase.com/docs/guides/storage/s3/compatibility): REST, S3 and resumable uploads share object access; this is not complete S3 conformance.
- [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads): use the documented 6 MiB chunk size. A HEAD between PATCH calls demonstrates offset-based continuation, not an interrupted socket or server restart.
- [Filename restrictions](https://supabase.com/docs/guides/storage/uploads/file-limits): generated names must satisfy the target's supported character contract.
- [Supabase error codes](https://supabase.com/docs/guides/storage/debugging/error-codes): authorization and configuration failures need conservative classification.
- [TUS core protocol](https://tus.io/protocols/resumable-upload): offset, status and version assertions require protocol-specific interpretation.

The initial Unicode/percent filename assumption was rejected rather than promoted as a new bug. Preserve that decision as a case study in oracle quality. Adding conditional requests or an offset-conflict case is justified only with a clear contract and a test showing the assertion detects a relevant failure.

## Architecture decisions

Keep the AWS SDK for signing. Separate direct transport, ownership/budgets, scenario assertions, result validation, rendering and CLI orchestration. Built-in scenario metadata provides enough structure for selection and reporting; a provider/plugin framework is unnecessary at this size.

A full TypeScript conversion is not a release requirement. Runtime validation is required at the imported-report and environment boundaries regardless of language. Add small type annotations or static checks where they prevent a concrete class of mistakes; avoid a toolchain migration that delays the safety work.

## Deliberately rejected or deferred

| Decision                                               | Reason                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| REJECT a hosted dashboard or large marketing frontend  | Offline reports already serve the review workflow without accounts, hosting or telemetry |
| REJECT a compatibility percentage                      | A small, selected diagnostic set cannot establish universal compatibility                |
| REJECT automatic issues, patches or maintainer contact | Observations need human review and independent reproduction                              |
| DEFER optional AI diagnosis                            | No validated need yet; deterministic explanations and evidence must work first           |
| DEFER claims of self-improvement                       | A retest heuristic has not beaten a fixed baseline under equal budgets                   |
| DEFER remote/cloud targets                             | They require a separate authorization and destructive-operation model                    |
| DEFER dynamic test packs and multi-provider adapters   | Built-in selection and a narrow S3 profile suffice until another real engine is tested   |
| DEFER performance features                             | Request timings are diagnostic observations, not controlled benchmarks                   |

The strongest defensible value proposition is a short, local cross-protocol diagnosis with reviewable evidence. Neither uniqueness, user demand, virality nor upstream adoption has been established.
