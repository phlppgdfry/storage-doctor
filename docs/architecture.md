# Architecture and contracts

```text
CLI / environment
       |
       v
Loopback-only validated configuration
       |
       v
Bounded sequential runner ---- fixed scenario assertions
       |
       +---- AWS SDK / SigV4 ---- S3 endpoint
       +---- direct HTTP/S ------ REST endpoint
       +---- direct HTTP/S ------ TUS endpoint
       |
       v
Allowlisted request observations + cleanup outcomes
       |
       +---- JSON / Markdown / offline HTML / checksums
       +---- export (evidence + replay recipe)
       +---- plan (one deterministic retest recommendation)
```

No daemon, database, model provider, remote report collector or agent framework. Payloads are deterministic from a validated seed, namespaces are random per run. A repeat uses identical bytes and fresh object identities. It does not replay a timing schedule.

## Boundaries

- `config.js`: accepts only literal loopback endpoints, dedicated bucket names, bounded request timeouts and constrained identifiers. Secrets are accepted only via environment variables and excluded by an explicit serialization allowlist.
- `adapter.js`: AWS SDK signs S3 requests; direct Node HTTP/S sends the small REST/TUS request surface. Captures operation names, status codes and elapsed time. Response data is bounded to 8 MiB. SDK retries and region redirects are disabled. HTTP redirects are rejected. TUS resource URLs stay in the configured origin and path.
- `scenarios.js`: fixed assertions and deterministic payload generation. The proposer cannot rewrite tests through a CLI option.
- `runner.js`: sequential execution, status classification and run-owned cleanup in `finally`. Ten scenarios maximum, 80 exploration requests and a 120-second exploration deadline checked before each request. Cleanup has a separate aggregate 30-second allowance across per-scenario cleanup attempts. Request deadlines include body reads and cannot exceed the remaining campaign or cleanup time. No infinite loop or concurrency load.
- `report.js`: escapes HTML, embeds no scripts or external assets, writes checksums and readable evidence. Export normalizes validated original observations plus a focused report and recipe. Every evidence file is hashed; hashes are integrity aids, not authenticated signatures.
- `cli.js`: strict flags, local-only execution, named scenario selection, CI exit semantics and a non-executing retest planner.

## Protocol assumptions

Supabase documents [interoperability](https://supabase.com/docs/guides/storage/s3/compatibility) between standard uploads, S3 and resumable uploads. We check bytes and visible state, not identical response schemas across protocols. [Resumable upload guidance](https://supabase.com/docs/guides/storage/uploads/resumable-uploads) specifies 6 MiB chunks; only the final chunk is smaller.

The key-encoding case uses permitted characters from [file-name restrictions](https://supabase.com/docs/guides/storage/uploads/file-limits): spaces and URL-sensitive ASCII punctuation. Initial Unicode/percent input was rejected locally and was removed as an invalid assumption, not hidden as a passing test. `s3-delete-rest` accepts a REST HTTP 400 only if its JSON explicitly records storage status 404, matching observed Supabase error behavior.

Each cross-protocol scenario writes through one interface and observes the same object through the other. TUS resume uses a HEAD observation between PATCH calls. It does not inject a mid-request failure. All comparisons use raw binary buffers, not text normalization or ETag equality. Metadata checks currently cover S3 HEAD, not a full cross-protocol metadata schema mapping.

## Classification limits

Authorization, availability and rate limits are inconclusive; unknown harness exceptions are ERROR. Other unexpected 4xx operations and explicit assertion failures are failed checks. An unexpected 4xx can still mean wrong configuration or a contract mismatch. A failed check is never automatically declared a confirmed defect.

The S3-only profile declares REST/TUS out of scope. It is not runtime capability discovery and cannot claim a provider lacks features. The integration helper uses privileged local credentials, so results do not establish RLS isolation, multi-tenant safety or production behavior.

## Research boundary

The other `storage-engineering-lab` and Supabase fork are read-only context for this project. They are neither dependencies nor modified by test execution. A published finding requires independent reproduction, upstream version matching, issue/PR overlap checks and semantics review. No automatic issue, PR, upload or maintainer contact exists.

## Adding a diagnostic

Add one scenario to `src/scenarios.js` with a stable ID, protocol list, documented preconditions, expected observation and reference. Keep its run function limited to the provided adapter and owned key; never create a raw network client or change a bucket. Metadata is attached in the same module. Register selectors in `src/runner.js` only when useful.

Use `expect` for contract assertions. Unexpected internal exceptions become ERROR. Add a fixture regression that proves the assertion can detect its intended defect, then validate against the actual local engine before claiming support. Keep malformed/unauthorized results conservative. Do not add a new provider or dynamic plugin layer on the strength of fixture success.

`src/transport.js` owns direct sockets and byte/time limits. `src/schema.js` is the authoritative import boundary. `src/report.js` owns exclusive output and complete bundle hashes. `src/fingerprint.js` hashes source modules; the published tag maps the package version to a Git revision. A full TypeScript migration was rejected: runtime validation solves the confirmed trust-boundary problems without duplicating evaluators.

## v0.3.0 additions

`compare.js` consumes two reports through the existing strict schema boundary. The CLI first verifies their full bundles and parses the same bounded report bytes that passed hashing, avoiding a second unverified read. A healthy recorded baseline, matching source/version, mode, selected IDs, payload, seed, profile, region, timeout and budgets are required. Live comparisons also require an explicitly declared matching authentication context. Object property order is irrelevant. A changed target version is allowed and surfaced; bucket/endpoint identities may change between disposable CI stacks. Timings, random namespaces and request traces are deliberately not a performance oracle. Unknown/incomplete evaluation takes precedence over regression exit 1. Source matching is intentionally strict: comparisons across diagnostic builds are rejected rather than silently reinterpreted. No schema migration was needed.

`demo.js` starts `demo-fixture.js` only for the explicit demo command, always sets fixture provenance and uses the same runner/report pipeline. The fixture moved from test-only code so the packed binary is self-contained; tests re-export that single implementation. It does not validate SigV4, model RLS or establish vendor behavior. Its temporary server binds literal loopback and caps request bodies. There is no separately implemented research engine.

The composite Action accepts an optional baseline, keeps the check's failure status, compares evidence offline, emits a short allowlisted status summary even after failure, and uploads artifacts through the existing pinned action. Summary Markdown includes stable scenario IDs and statuses, never imported prose or credentials. The local consumer smoke executes actual shell commands from a deliberately constrained manifest layout; it is not a general YAML interpreter or a substitute for hosted runner/artifact validation.

The release audit tightened the import boundary to canonical UTC timestamps, chronological run endpoints and matching result/run fingerprints. `authContext` is a bounded non-secret declaration, never a credential digest or inferred privilege assertion. This makes an unknown auth precondition explicit without introducing permission probing or remote services.
