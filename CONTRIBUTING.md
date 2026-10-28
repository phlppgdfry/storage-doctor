# Contributing

Start with `npm ci` and `npm run verify`. For a real local stack, follow README and run `npm run integration`.

Keep one behavior per change. Define the protocol contract, preconditions and expected observation before writing an assertion. Reuse the SDK rather than introducing custom signing. Include a small regression case that would fail for the relevant defect; do not weaken checks merely to get a green run.

New checks must use only dedicated run-owned object keys, bounded requests and local endpoints. Exports must not include credentials, authorization headers or arbitrary response bodies. Keep status meanings and exit codes stable. Additions to the protocol fixture do not establish compatibility with a real engine.

Before proposing an upstream defect: record exact target version, rerun against a fresh namespace, check documented behavior, inspect current upstream work and consider configuration/harness explanations. A report is an observation until independently verified.

No automatic issue creation, PR submission, report upload or contact with maintainers. Suspected vulnerabilities follow SECURITY.md.
