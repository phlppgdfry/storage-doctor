# Storage Doctor 0.3.0

Status: **STABLE — MAINTENANCE MODE**. [v0.3.0 is published](https://github.com/phlppgdfry/storage-doctor/releases/tag/v0.3.0). Release source/tag commit: `d8be992eff8ae64c3514bdeac43a8735ed09266b`; [PR #1](https://github.com/phlppgdfry/storage-doctor/pull/1) is merged. This status-only closure update does not change the released runtime or package.

Storage Doctor is a bounded local object-storage diagnostic CLI for Supabase REST/S3/TUS. It checks exact bytes and state visibility, writes offline evidence, verifies bundles and compares compatible runs without treating missing assurance as success. No cloud scanning, production/RLS certification or universal S3 compliance is claimed.

Implemented: ten fixed scenarios and packs, deterministic payloads, strict local transport/resource ownership and budgets, JSON/Markdown/HTML reports, checksum verification/export, configuration doctor, installed fixture demo, conservative regression comparison and a composite GitHub Action with an optional unique artifact name. The planner remains a fixed heuristic. No AI key or telemetry.

Verified engineering evidence on the release commit: [Node 22/24 suites](https://github.com/phlppgdfry/storage-doctor/actions/runs/41145223787) (33 tests each), [real hosted Supabase checks](https://github.com/phlppgdfry/storage-doctor/actions/runs/41168269115) (10/10 and Action core 3/3), [four isolated hosted Action consumer cases](https://github.com/phlppgdfry/storage-doctor/actions/runs/41145223764), artifact retrieval/verification and scoped security regressions. All four public assets were downloaded without authentication and matched their validated bytes; all four downloaded report bundles verified. The downloaded package passed fresh installation, CLI and prewarmed-cache offline installation on Node 24; the identical archive also passed Node 22 before publication. Archive SHA-256: `2043542d792f3646540afa509c5786e76f2a8088d5277d874b8c8e89484f8607`. Exact final commit/run/artifact data is attached as VALIDATION.json; earlier executions and failures remain in [validation](docs/validation.md). The [release process](docs/release.md) defines mandatory gates.

Install from the reviewed v0.3.0 GitHub archive/source tag, then follow [README](README.md). The [review packet](docs/review.md) supplies independent tasks and expected exits. npm publication is not part of this release. Demo corruption is a synthetic fixture fault, not a vendor defect.

Limitations: literal loopback only; no production tunnels; no complete S3/RLS/crash-recovery or performance certification. Checksums establish integrity, not authenticity. Auth context is user-declared. Hard process/host loss may leave disposable resources. Independent human usability and security review remain unperformed. Windows execution is unverified.

This project is in maintenance: security/confirmed-bug/dependency fixes are welcome; new features need real user evidence. No rewrite, permanent feature-development obligation or archived/read-only repository is intended. [Contributing](CONTRIBUTING.md), [security reporting](SECURITY.md), [conditional roadmap](docs/roadmap.md).

The historical discovery/candidate status is [preserved here](docs/history/current-state-before-v0.3.0.md). Release candidates, real snapshots, authentic recordings and v0.2.0 history remain intact.
