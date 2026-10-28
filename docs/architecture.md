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
       +---- fetch -------------- REST endpoint
       +---- fetch -------------- TUS endpoint
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
- `adapter.js`: AWS SDK signs S3 requests; standard fetch sends the small REST/TUS request surface. Captures operation names, status codes and elapsed time. Response data is bounded to 8 MiB. SDK retries and region redirects are disabled. HTTP redirects are rejected. TUS resource URLs stay in the configured origin and path.
- `scenarios.js`: fixed assertions and deterministic payload generation. The proposer cannot rewrite tests through a CLI option.
- `runner.js`: sequential execution, status classification and run-owned cleanup in `finally`. Ten scenarios maximum, 80 exploration requests and a 120-second exploration deadline checked before each request. Cleanup runs outside that budget so resources can still be removed. It is bounded by the finite owned-object list and per-request timeout. No infinite loop or concurrency load.
- `report.js`: escapes HTML, embeds no scripts or external assets, writes checksums and readable evidence. Export preserves the original report plus a focused scenario report; hashes are integrity aids, not authenticated signatures.
- `cli.js`: strict flags, local-only execution, named scenario selection, CI exit semantics and a non-executing retest planner.

## Protocol assumptions

Supabase documents [interoperability](https://supabase.com/docs/guides/storage/s3/compatibility) between standard uploads, S3 and resumable uploads. We check bytes and visible state, not identical response schemas across protocols. [Resumable upload guidance](https://supabase.com/docs/guides/storage/uploads/resumable-uploads) specifies 6 MiB chunks; only the final chunk is smaller.

The key-encoding case uses permitted characters from [file-name restrictions](https://supabase.com/docs/guides/storage/uploads/file-limits): spaces and URL-sensitive ASCII punctuation. Initial Unicode/percent input was rejected locally and was removed as an invalid assumption, not hidden as a passing test. `s3-delete-rest` accepts a REST HTTP 400 only if its JSON explicitly records storage status 404, matching observed Supabase error behavior.

Each cross-protocol scenario writes through one interface and observes the same object through the other. TUS resume uses a HEAD observation between PATCH calls. It does not inject a mid-request failure. All comparisons use raw binary buffers, not text normalization or ETag equality. Metadata checks currently cover S3 HEAD, not a full cross-protocol metadata schema mapping.

## Classification limits

Authorization, availability, rate limits and unknown harness errors are inconclusive. Other unexpected 4xx operations and explicit assertion failures are failed checks. An unexpected 4xx can still mean wrong configuration or a contract mismatch. A failed check is never automatically declared a confirmed defect.

The S3-only profile declares REST/TUS out of scope. It is not runtime capability discovery and cannot claim a provider lacks features. The integration helper uses privileged local credentials, so results do not establish RLS isolation, multi-tenant safety or production behavior.

## Research boundary

The other `storage-engineering-lab` and Supabase fork are read-only context for this project. They are neither dependencies nor modified by test execution. A published finding requires independent reproduction, upstream version matching, issue/PR overlap checks and semantics review. No automatic issue, PR, upload or maintainer contact exists.
