# Contributing

For an evaluation without the author’s environment, start with the [independent review packet](docs/review.md). For source development, start with `npm ci` and `npm run verify`. For a real local stack, follow README and run `npm run integration`.

Keep one behavior per change. Define the protocol contract, preconditions and expected observation before writing an assertion. Reuse the SDK rather than introducing custom signing. Include a small regression case that would fail for the relevant defect; do not weaken checks merely to get a green run.

New checks must use only dedicated run-owned object keys, bounded requests and local endpoints. Exports must not include credentials, authorization headers or arbitrary response bodies. Keep status meanings and exit codes stable. Additions to the protocol fixture do not establish compatibility with a real engine.

Before proposing an upstream defect: record exact target version, rerun against a fresh namespace, check documented behavior, inspect current upstream work and consider configuration/harness explanations. A report is an observation until independently verified.

No automatic issue creation, PR submission, report upload or contact with maintainers. Suspected vulnerabilities follow SECURITY.md.

Run `npm run package:smoke` and `npm run action:smoke` before a release. Use `npm run package:fresh` for a network-backed fresh cache installation. Review dependency updates with production audit, fixture fault tests and real local integration; retain exact dependency versions/lockfile and do not silently refresh action SHAs. Protocol changes need source-backed expectations and real-engine evidence.

The development/security suite currently targets macOS/Linux and uses the standard POSIX `mkfifo` utility for an adversarial-file regression. Windows setup and testing are not verified. Use `npm run demo:record` for a genuine timed fixture capture; keep fixture findings separate from real-engine evidence. New comparator cases must preserve invalid/incomplete exit 2, verify complete bundles and avoid credential-derived fingerprints.
