# Security

Use only disposable local targets and credentials. `check` writes, reads and deletes exact keys under its unique `doctor/UUID/` namespace in an existing dedicated bucket; it never empties or deletes buckets. The repository integration helper separately creates and deletes only its own unique private test bucket. Concurrent-run ownership and cleanup after partial failure/cancellation are tested.

Only literal loopback addresses are accepted, at configuration and execution boundaries. Direct sockets avoid global proxy/fetch settings, validate the connected address and enforce TLS validation. Redirects are refused. A loopback tunnel to production is not a safe test environment and cannot be detected reliably. Hostile kernels, compromised local services or instrumentation of the Node process are outside this model.

Limits: 80 exploration requests, 120-second campaign, one sequential request at a time, one attempt, 8 MiB per request/response including S3 error XML, bounded headers, 30-second aggregate cleanup. SIGINT/SIGTERM cancel exploration and permit cleanup; SIGKILL/crashes cannot. Cleanup failures make automation fail; manually remove only the listed disposable keys when access recovers.

Reports exclude authorization headers, raw response bodies and credential objects. Strict imports reject unknown fields, malformed values and recognizable credential formats; no detector can recognize every arbitrary secret disguised as a user-written label. Review public identifiers before sharing. New output directories and exclusive files prevent accidental overwrite and symlink replacement. Bundles include all evidence files in their checksums; this verifies integrity, not authorship.

## Private reporting

Use [GitHub private vulnerability reporting](https://github.com/phlppgdfry/storage-doctor/security/advisories/new) for suspected Storage Doctor vulnerabilities. Publication is gated on enabling and verifying that route. Do not place credentials or exploit details in a public issue. There is no promised response SLA.

Supabase findings follow [Supabase's policy](https://github.com/supabase/storage/blob/master/SECURITY.md). Storage Doctor never submits findings, posts reports or contacts maintainers automatically.
