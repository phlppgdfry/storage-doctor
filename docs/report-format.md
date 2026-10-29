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

## Offline CI comparisons (v0.3.0)

```sh
storage-doctor compare --baseline BASELINE/report.json --report CURRENT/report.json --json
```

The CLI adds an `integrity` statement after verifying both bundles. Comparison JSON has `comparisonVersion: 1`, both run IDs, `mode`, `comparable`, `outcome`, `blockers`, status `changes`, `regressions`, declared `targetVersions`, `exitCode`, limitations and a next step. It does not change report schema 2. Exit 0 means no status regression among all comparable executed checks; 1 means a previously passed assertion now fails; 2 means unsuitable baseline, mismatched diagnostic inputs/build/selection, incomplete evaluation or cleanup uncertainty. If regression and incompleteness coexist, exit 2 wins while comparable regression details remain visible.

The baseline must have only PASS results and recorded successful cleanup. Unsupported selections do not establish a healthy baseline. To use an S3-only target, select only supported S3 scenarios. Legacy evidence lacking build/cleanup provenance can still be rendered/verified but cannot establish a comparison baseline. The CLI verifies every sibling manifest entry before comparing and parses the exact report bytes that passed hashing. Inputs must be named `report.json` and retain the original bundle files plus `checksums.json`. Missing manifests, altered JSON/HTML, unsafe paths and checksum mismatches exit 2. This verifies integrity, not authorship: an attacker who rewrites both files and manifest can forge a bundle. Trust the source and artifact provenance independently. The internal `compareReports` function validates in-memory objects only and cannot establish file integrity.

Target image/version changes are allowed for upgrade testing. Matching declared fields does not prove equivalent credentials, container configuration or network conditions. Endpoint and bucket identities are not compared because ephemeral CI stacks change them. Capture the exact target image/digest with `SD_TARGET_VERSION`; unrecorded versions cannot substantiate upgrade attribution. Failed comparisons are observations requiring reproduction, not automatic defect claims. Fixture/live comparison is blocked.

### RC semantic audit

- PASS→FAIL: comparable assertion disagreement, exit 1; not a confirmed target defect or root cause.
- PASS→INCONCLUSIVE/UNSUPPORTED/SKIPPED/ERROR: lost assurance, exit 2. A simultaneous comparable PASS→FAIL remains listed, but incomplete exit 2 takes precedence.
- FAIL→PASS or FAIL→INCONCLUSIVE: baseline is unhealthy, exit 2. No success or improvement claim is inferred.
- Missing/additional scenario IDs: incomparable, exit 2. Reordering is allowed; duplicates and unknown IDs are rejected by schema validation.
- Unsupported schemas are rejected. Converted schema 1 and native schema 2 provenance cannot be silently mixed. Historical rendering/verification remains available.
- Target versions may differ for upgrade investigations. Profile, protocol requirements, source/version, payload/seed, region, timeout, budget, selection and declared auth context must match.
- Live reports require an explicit recorded `SD_AUTH_CONTEXT`. Labels are not derived from credentials or decoded JWTs and cannot prove actual permission equality. A changed policy with an unchanged label is outside the comparator's knowledge; verify this precondition yourself.
- Missing/invalid timestamps, noncanonical/impossible dates, end-before-start, conflicting per-result fingerprints or reproduction metadata, invalid summaries and malformed evidence are rejected.

Schema 2 adds optional `config.authContext` in this candidate. New readers still accept older schema 1/2 history; strict 0.2.0 readers may reject this added field. Use the matching 0.3.0 tool to inspect new reports. No new protocol assertion or status meaning was introduced.

A manifest must describe exactly the three report files or the complete five-file export, including both original-report.json and REPRODUCE.md. Partial export manifests are rejected. Replay prose is escaped as Markdown data, not treated as executable instructions. History with an unrecorded environment fingerprint can still be rendered and verified, but cannot establish a comparison baseline.
