# Working on Storage Doctor

Read README.md and docs/architecture.md before changing protocol assertions. This repo is separate from ../storage-engineering-lab and ../supabase-storage; do not modify those working trees as part of this project.

Use `npm run verify` for formatting, harness tests and a clearly labelled fixture demo. The fixture opens an ephemeral loopback port. `npm run package:smoke` verifies the packed binary in a separate clean consumer using the locked graph and prefer-offline cache policy. `npm run integration` requires this project's own Supabase stack on port 55431; it obtains local credentials in memory and never logs them.

Keep checks bounded and limited to literal loopback targets. Only clean up exact run-owned object keys and explicitly provisioned private buckets. Preserve failed observations when investigating a contract mistake. Never turn an unexpected response into a bug claim without checking documented behavior and independently reproducing it.

Generated reports live under ignored reports/. examples/verified-supabase contains one deliberately reviewed real-run snapshot. No production credentials or raw server logs belong in evidence.

Do not publish packages, push, create external repositories/issues/PRs, upload reports or contact maintainers without explicit authorization. Current optional AI, shrinking and self-improving evaluation ideas are roadmap items; do not claim they are implemented.
