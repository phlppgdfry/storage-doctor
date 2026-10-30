# Release process and v0.3.0 record

Storage Doctor is distributed as a GitHub source tag and a reviewed npm-format archive. It is not published to npm. The v0.2.0 draft and assets are preserved. Historical candidate decisions are retained in [the archived readiness record](history/release-readiness-before-v0.3.0.md); they are not current approval restrictions.

The owner explicitly authorized the existing branch push, draft PR, release fixes, hosted checks, validated merge, annotated tag and GitHub v0.3.0 publication on 2026-10-31. npm publication and external reviewer contact remain outside that authorization.

## Mandatory engineering gates

| Gate                       | Required evidence                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Core correctness and tests | Exact intended commit passes supported Node 22/24 tests, formatting, syntax and documented fixture checks                                                    |
| Local/real integration     | Bounded real Supabase scenarios and exact owned cleanup; failures classified without target-bug claims                                                       |
| Hosted CI                  | Actual successful Node 22/24 jobs, logs and tested SHA                                                                                                       |
| Distributed Action         | Separate checkout, real Action installation, success/fault/setup cases, exits, reports, artifact upload/download/integrity, redaction and cleanup            |
| Package/install            | Exact intended artifact passes fresh and supported offline installation, entrypoints/help/demo/compare/export/verify, and has correct file allowlist/version |
| Security                   | Scoped adversarial tests, credential review, dependency audit and redacted source/history/package scans; no unresolved critical finding                      |
| Reproducibility            | Repeated packs are byte-identical; final SHA-256 manifest matches assets and source mapping                                                                  |
| Documentation/presentation | Commands, links, limits, authentic capture and source/Action references match the distribution                                                               |
| Release consistency        | Merge commit passes relevant post-merge checks; annotated v0.3.0 maps to the tested source; downloaded public assets match validated bytes                   |

PASS applies only to recorded evidence. Missing results are NOT EXECUTED, never PASS. Human usability interviews and independent human security review remain unperformed and are disclosed limitations, not claimed certifications. This release’s mandatory automated engineering gates do not imply market or commercial production validation.

## Hosted validation record

The initial `419b20e` PR passed [Node 22/24](https://github.com/phlppgdfry/storage-doctor/actions/runs/41143236077) and [real Supabase/Action checks](https://github.com/phlppgdfry/storage-doctor/actions/runs/41143236076).

The new independent consumer gate initially failed at `690b74f`: [retained failed run](https://github.com/phlppgdfry/storage-doctor/actions/runs/41143649443). A missing `await` in the newly added checker compared a Promise to false for invalid setup. The fix has a focused regression test. The artifact API also exposed multiple different uploads under the same default name; the optional `artifact-name` input now permits unambiguous matrix/repeated-call selection while preserving the original default.

At `9c3f576`, [Verify](https://github.com/phlppgdfry/storage-doctor/actions/runs/41144066363), [real integration](https://github.com/phlppgdfry/storage-doctor/actions/runs/41144066357) and [all four consumer cases](https://github.com/phlppgdfry/storage-doctor/actions/runs/41144066393) passed. Downloaded bundles were verified locally; actual logs show exits 0/1/2, masking of synthetic credentials and zero leftover fixture objects. The final intended and merge commits must pass the same gates; their exact SHAs/run URLs and final package checksum are recorded in the release’s `VALIDATION.json` asset. This avoids pretending an earlier SHA is the final tested source.

## Finalization procedure

1. Preserve user changes, review the entire diff and scan reachable history/source/package for secrets. Never force-push.
2. Pass all mandatory checks for the intended PR SHA. Inspect actual logs/artifacts and unresolved review comments. Mark the PR ready only after the gates pass.
3. Merge while matching the reviewed head SHA. Preserve commit history; do not modify the v0.2.0 draft.
4. Confirm the main merge SHA, run relevant post-merge Node/service/consumer checks, then build the exact package. Validate that exact archive on both supported Node versions, including a fresh consumer and supported offline mode. An empty dependency cache cannot install dependencies offline.
5. Verify repeated packs, versions, executable/file list, audits and scans. Produce `SHA256SUMS` and `VALIDATION.json` with exact source/run/asset data. Checksums are integrity, not signatures or authorship proof.
6. Check that v0.3.0 does not conflict with an existing tag/release; create an annotated tag on the validated merge commit. Publish the GitHub release and attach the validated archive and manifests.
7. Download the public assets, verify their bytes, install the released archive, and run the documented demo/comparison/evidence flow. Check the public release and installation links.
8. Only after confirmed publication, update CURRENT_STATE to STABLE — MAINTENANCE MODE. A status-only closure commit may follow the tag; it must not alter shipped sources or the package, and main must remain clean. Record both release and closure commits transparently.

The public [v0.3.0 release](https://github.com/phlppgdfry/storage-doctor/releases/tag/v0.3.0) is the distribution record. [CURRENT_STATE](https://github.com/phlppgdfry/storage-doctor/blob/main/CURRENT_STATE.md) identifies actual publication/maintenance status. No release or npm publication may be inferred merely from a local archive.

## Maintenance boundary

Security fixes, confirmed bugs and dependency maintenance remain allowed. New features require demonstrated user value, documented expectations and reviewable verification. No speculative provider/plugin/AI framework, permanent feature-development promise or upstream endorsement is implied. Contacting external users or publishing npm requires separate authorization.
