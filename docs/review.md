# Independent review packet

Storage Doctor checks exact bytes and visible state across local Supabase REST/S3/TUS, retains bounded evidence, and compares compatible runs. This packet applies to version 0.3.0. It does not establish production certification, universal S3 compliance or market validation. Actual hosted runs are recorded in validation; external user sessions remain unperformed. [Current gates](release.md).

## What the reviewer needs

Use a reviewed candidate checkout or the supplied exact `storage-doctor-0.3.0.tgz`, its `SHA256SUMS` and source-commit metadata. Do not install an unverified registry package with this name. Node 22/24 and npm are required; the development suite is verified on macOS/Linux. The fixture review needs no Docker, Supabase, account or credentials. First installation downloads runtime dependencies unless their archives are already cached.

Verify the archive against the supplied checksum using `shasum -a 256` on macOS or `sha256sum` on Linux. Check the value and filename; a checksum is not proof that the supplier is trustworthy. Confirm the source commit independently with the owner before relying on a package.

## Install and execute the package

Start in a new empty directory, not the author's checkout. Replace the archive path with the reviewed absolute path:

```sh
npm init -y
npm install --ignore-scripts --no-audit --no-fund /absolute/path/to/storage-doctor-0.3.0.tgz
SD_REVIEW_CLI=./node_modules/.bin/storage-doctor
"$SD_REVIEW_CLI" --version --json
"$SD_REVIEW_CLI" --help
"$SD_REVIEW_CLI" demo --out baseline
"$SD_REVIEW_CLI" demo --inject-corruption --out candidate
"$SD_REVIEW_CLI" compare --baseline baseline/report.json --report candidate/report.json --json
"$SD_REVIEW_CLI" export rest-to-s3 --report candidate/report.json --out reproduction
"$SD_REVIEW_CLI" verify --report reproduction --json
```

Expected: version 0.3.0; baseline ten passes / exit 0; injected corruption nine failures and one passing deletion check / exit 1; comparison `regression` / exit 1; export exit 0; verification five files / exit 0. The two exit-1 commands are intentional: run them separately rather than chaining everything with `&&` or a shell-wide `set -e`. Open baseline/report.html and candidate/report.html manually. Identify expected bytes, observed disagreement and cleanup outcome. This is synthetic protocol behavior, not a Supabase defect.

Then test lost assurance and integrity refusal:

```sh
"$SD_REVIEW_CLI" compare --baseline candidate/report.json --report baseline/report.json --json
printf '\ncontrolled local artifact edit\n' >> candidate/report.html
"$SD_REVIEW_CLI" compare --baseline baseline/report.json --report candidate/report.json --json
```

Both return exit 2: an unhealthy baseline is unsuitable, and changing an evidence file invalidates its manifest. Keep the first untouched reproduction bundle if you need to share observations. Repeat the demo in new output directories for a fresh run; evidence is never overwritten. Retain the actual command, exit and report manifest for any unexpected outcome. No replay instructions execute automatically.

## Optional source and real-engine review

From the reviewed checkout run `npm ci`, `npm run verify`, `npm run package:offline` (prewarmed cache), `npm run package:fresh` (empty private cache plus registry access) and `npm run action:smoke`. Source tests include a checkout-with-spaces regression; its CLI stub stops before storage requests. [Architecture](architecture.md) identifies the small engine/import/transport boundaries. [Validation](validation.md) records actual executions and historical failures.

Only after explicitly provisioning your own disposable local target, follow [configuration](configuration.md) and the README's integration recipe. The helper uses privileged local service credentials and fresh private buckets; it does not certify end-user RLS. Live comparison requires a matching declared non-secret auth context. Labels do not attest effective permission equality. Never use production, a remote endpoint or a loopback production tunnel.

For GitHub review use the [separate consumer workflow](../examples/consumer-workflow.yml) with an actual authorized, published 40-character commit SHA. It checks out the distributed Action into its own path, provisions only its disposable stack, retrieves this workflow run's named artifact and verifies it. `actions: read` supports that read-only download. Current local shell-consumer checks cover success, corruption, unknown packs, missing credentials and output redaction. The four-case hosted consumer gate validates uploads, downloads, integrity, setup errors and cleanup. Forced runner termination/crash recovery is not certified; do not treat successful cleanup as a guarantee after host loss.

## Questions and feedback

Ask one Supabase-experienced developer and one newcomer to work independently, with consent and no initial coaching. Do not contact them automatically. The five-minute onboarding and interpretation protocol is in [product validation](product-validation.md). The following fields are intentionally blank: no external outcomes exist yet.

- Reviewer / date / consent:
- Artifact SHA-256 / source commit:
- OS, architecture, Node and npm versions:
- Task completed / elapsed time / assistance:
- Setup difficulties / failed exact commands and exits:
- Expected versus observed result:
- Misunderstood instructions / missing documentation:
- Did the report change your next debugging step? Why?
- Can you distinguish fixture evidence, lost assurance and a confirmed vendor defect?
- Can you explain integrity versus authenticity and the local-only boundary?
- Sanitized reproduction and manifest (no credentials):

Reviewers should challenge false-green outcomes, cleanup scope, imported-data trust, reproducibility and whether the workflow adds value over existing tests. Report suspected security issues through [private reporting](../SECURITY.md); do not create a public exploit report. A project owner must separately authorize public issues, external contact, pushes, releases and npm publication.
