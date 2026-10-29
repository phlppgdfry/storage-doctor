# Current state — v0.3.0 discovery

2026-10-29; baseline `d0054a8`, tag `v0.2.0`. The only pre-existing working-tree change was `scripts/package-smoke.js` switching offline installation to prefer-offline; preserved. Development branch: `work/v0.3.0-regression-evidence`.

- Verified baseline: `npm run verify` on Node 24.21.0 passes formatting, syntax, documentation links, 22 tests and ten fixture scenarios. The sandbox first blocked loopback listeners; the authorized host rerun passed.
- GitHub read-only inspection: v0.2.0 remains a draft with two assets; no open issues/PRs. Actions enabled, all actions allowed, repository-wide SHA pinning not required. No administration or release changes made.
- Source since v0.2.0: no committed changes. Historical live Linux integration and Action results remain in docs/validation.md; they are not fresh candidate evidence.
- Verified architecture: bounded local REST/S3/TUS scenarios, direct transport, exact owned cleanup, validated schema 1/2 imports, exclusive report outputs and checksum verification. Existing protocol assertions are retained.
- Technical limitation: exported replay recipes already preserve seeds, but reports cannot currently serve as an automated behavioral regression gate. A green historical report is easy to compare incorrectly with a partial, fixture, or differently configured run.
- Confirmed onboarding limitation: the packed binary has no demo command. The documented checkout demo imports test-only files. README calls the consumer smoke offline despite the pre-existing prefer-offline modification.
- Product limitation: no independent user feedback, production/RLS evidence, universal S3 compliance or validated adaptive strategy. Existing planner is a fixed retest heuristic. AI and generalized shrinking have no confirmed use case.
- Highest-value scope: conservative offline report comparison for CI, a packaged explicitly labelled fixture demo, consumer smoke coverage, and concise Action summaries. Keep schema 2 and the same diagnostic engine. No new runtime dependencies or research-mode branding.

Execution evidence and final gates: [validation](docs/validation.md), [release](docs/release.md). Priorities and alternatives: [product validation](docs/product-validation.md).

## Concise progress log

- DISCOVER/VERIFY: read source, docs, tests, Action and GitHub state; baseline 22/22, existing draft untouched.
- PRIORITIZE: seven candidates scored in product-validation.md; selected conservative offline CI comparison plus packaged demo/summary.
- IMPLEMENT/TEST: shared engine retained; 26 tests pass on explicit Node 22 and Node 24; clean package and separate Action shell consumer pass.
- CHALLENGE/IMPROVE: reject incompatible/incomplete baselines, canonical budget comparison, preserve JSON usage errors, verify injected Action failure, isolate consumer SD_* env. No independent human reviewer claimed.
- DOCUMENT: update existing docs, protocols, launch drafts, architecture, changelog and real v0.3.0 example; retain all historical evidence.
- RELEASE GATE: local candidate prepared; hosted candidate CI, independent users and visual browser validation remain unverified. No push/publication performed.

## Release engineering follow-up gap assessment

- **HIGH — fixed:** CLI compare accepted schema-valid edits without checking sibling manifests. Now hashes the complete bundle and parses exact verified report bytes; altered/missing evidence cannot silently succeed.
- **HIGH — fixed:** live comparisons omitted authentication context. A non-secret explicit matching declaration is now required; actual permission equivalence remains an operator precondition, not a claimed attestation.
- **MEDIUM — fixed:** timestamp parsing accepted noncanonical dates and chronology; per-result/run fingerprints could conflict. Strict imports and focused negative tests now reject these.
- **MEDIUM — fixed:** README's clone-main quickstart could imply unpublished candidate commands already existed on main. Candidate status and reviewed-checkout requirement are explicit; narrative now follows problem → solution → demo → real evidence → CI → limits.
- **ALREADY SATISFIED:** exact owned cleanup, budget/cancellation handling, loopback transport/proxy isolation, strict import/output paths, fixture/live provenance, two Node versions, clean consumers, private reporting route, pinned third-party Actions and preserved history.
- **BLOCKER for unconditional release:** current branch not pushed; hosted Node/service/Action checks cannot be claimed. Explicit owner push/public-PR approval is required.
- **MEDIUM outstanding:** no independent human review or two external user sessions. Protocol exists; no outcomes are invented.
- **LOW:** no public v0.3.0 tag, npm publication or provenance attestation. These are explicitly withheld rather than fabricated.

Final follow-up execution: 31/31 tests on explicit Node 22.23.4 and Node 24.22.2, none skipped; true offline and fresh-cache consumers pass; two final-source real runs pass 10/10 each; actual approximately 45-second cast captured and source-matched. Added manifest-pair, FIFO and imported replay-data tests. Full history redacted secret scan passes. Current detailed evidence is the final RC2 section of docs/validation.md; publication remains gated on explicit approval.
