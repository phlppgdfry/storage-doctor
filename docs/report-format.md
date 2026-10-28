# Result format and evidence replay

The runtime contract lives in `src/schema.js`. Version 0.2.0 emits schema **2**. It reads valid historical schema 1 reports and explicitly normalizes them to schema 2 with `sourceSchemaVersion: 1`; missing historical cleanup details remain `unrecorded`. Historical files are preserved unchanged in Git. Unknown schema versions, unknown fields, impossible counts, nonfinite/negative timings and malformed traces are rejected, not silently accepted.

A report records tool version, run UUID, timestamps, Node/platform, allowlisted target configuration (including signing region), a SHA-256 environment fingerprint and deterministic payload hash. The fingerprint describes configuration, not a certified machine image or independent attestation. The package version identifies the source release, while `sourceFingerprint` hashes all shipped source modules in sorted order. A published tag supplies the Git revision. The fingerprint is not a signature.

Each result contains ID/title/description, protocols, prerequisites, expected behavior, observed reason and reason code, documentation reference, status, diagnostic duration, request trace, per-scenario cleanup, replay parameters and environment fingerprint. Request traces record protocol, operation, HTTP status (or null) and duration; they exclude headers, response bodies and arbitrary server errors. Cleanup requests are recorded separately from diagnostic requests.

| Serialized status | Display      | Meaning                                                                                                                        |
| ----------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `passed`          | PASS         | All assertions passed in this run                                                                                              |
| `failed`          | FAIL         | Contract assertion disagreed or expected operation returned an unexpected client response; investigate configuration/semantics |
| `unsupported`     | UNSUPPORTED  | Selected profile excludes required protocols; not runtime provider capability discovery                                        |
| `skipped`         | SKIPPED      | Not executed after cancellation/budget exhaustion                                                                              |
| `inconclusive`    | INCONCLUSIVE | Network, timeout, authorization, throttling or budget prevents a reliable conclusion                                           |
| `error`           | ERROR        | Unexpected harness failure; no target defect is established                                                                    |

Exit 2 takes precedence for errors, incomplete/skipped results or cleanup warnings. Otherwise failed checks return 1; all applicable checks passing return 0. There is no universal compatibility score. Timings are observations, not benchmarks.

## Independent replay

```sh
storage-doctor export rest-to-s3 --report RUN/report.json --out NEW_BUNDLE
storage-doctor verify --report NEW_BUNDLE
```

All five evidence files (`report.json`, Markdown, HTML, normalized original report and `REPRODUCE.md`) are hashed in `checksums.json`. Verification rejects path traversal, symlinks, oversized files and changed contents. Checksums verify integrity, not authorship. Public metadata may contain local identifiers; review it before sharing. Recognition of common credential formats is an additional check, not a guarantee that arbitrary user-written text is secret-free.

The recipe names a scenario, tool version, seed, profile, region and target version. Provision the same local engine separately, create a fresh dedicated bucket, supply credentials privately and run the named scenario. New UUID keys prevent collisions. A recipe is not a self-contained engine or an independently verified finding. Current live validation exercises named replay; no confirmed novel target finding is claimed.

Render an existing report without contacting storage:

```sh
storage-doctor report --report RUN/report.json --out NEW_RENDER
```

Output directories must be new. Exports deliberately normalize the original input rather than copying arbitrary untrusted JSON. If you need the exact original bytes for forensic review, retain that source privately outside the shareable bundle.
