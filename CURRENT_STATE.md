# Storage Doctor 0.3.0

Status: **RELEASE FINALIZATION — publication pending**. Switch to STABLE — MAINTENANCE MODE only after the public release and downloaded assets are verified.

Storage Doctor is a bounded local object-storage diagnostic CLI for Supabase REST/S3/TUS. It checks exact bytes and state visibility, writes offline evidence, verifies bundles and compares compatible runs without treating missing assurance as success. No cloud scanning, production/RLS certification or universal S3 compliance is claimed.

Implemented: ten fixed scenarios and packs, deterministic payloads, strict local transport/resource ownership and budgets, JSON/Markdown/HTML reports, checksum verification/export, configuration doctor, installed fixture demo, conservative regression comparison and a composite GitHub Action with an optional unique artifact name. The planner remains a fixed heuristic. No AI key or telemetry.

Verified engineering evidence: Node 22/24 suites (33 tests), real local and hosted Supabase checks, four isolated hosted Action consumer cases, artifact retrieval/verification and scoped security regressions. Exact final commit/run/artifact data belongs in the public release's VALIDATION.json; earlier executions and failures remain in [validation](docs/validation.md). The [release process](docs/release.md) defines mandatory gates.

Install from the reviewed v0.3.0 GitHub archive/source tag, then follow [README](README.md). The [review packet](docs/review.md) supplies independent tasks and expected exits. npm publication is not part of this release. Demo corruption is a synthetic fixture fault, not a vendor defect.

Limitations: literal loopback only; no production tunnels; no complete S3/RLS/crash-recovery or performance certification. Checksums establish integrity, not authenticity. Auth context is user-declared. Hard process/host loss may leave disposable resources. Independent human usability and security review remain unperformed. Windows execution is unverified.

After publication this project enters maintenance: security/confirmed-bug/dependency fixes are welcome; new features need real user evidence. No rewrite, permanent feature-development obligation or archived/read-only repository is intended. [Contributing](CONTRIBUTING.md), [security reporting](SECURITY.md), [conditional roadmap](docs/roadmap.md).

The historical discovery/candidate status is [preserved here](docs/history/current-state-before-v0.3.0.md). Release candidates, real snapshots, authentic recordings and v0.2.0 history remain intact.
