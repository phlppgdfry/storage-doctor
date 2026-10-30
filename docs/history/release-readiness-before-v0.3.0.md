# Historical record — superseded by the v0.3.0 release process

Preserved from the pre-publication working tree. These dated candidate decisions are history, not current release authorization or status. See [current release process](../release.md) and [current project state](https://github.com/phlppgdfry/storage-doctor/blob/main/CURRENT_STATE.md).

# Release readiness and process

**Current: v0.3.0 is a local release candidate, not cleared for publication.** Current gates are at the end of this document. The following v0.2.0 assessment is historical and remains preserved.

Verified initial-release version: **0.2.0**, a report-format and safety upgrade from 0.1.0. All critical engineering gates passed; the remaining limitations below define its local-first MVP scope.

## Candidate quality gates

Local critical gates passed before initial source publication. Remote fast CI and service/Action CI have now also passed. Evidence is in [validation](../validation.md), the [audit](../upgrade-audit.md) and the checked-in [real-run snapshot](../../examples/v0.2.0/report.json).

| Category             | Decision                  | Evidence and limitation                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Security             | PASS WITH LIMITATIONS     | 12 independent security regressions pass; no unresolved critical finding in reviewed paths. Not external certification; tunnels/host compromise excluded.                                                                                                                                                                                                    |
| Correctness          | PASS WITH LIMITATIONS     | Ten source-backed scenarios pass on current local Supabase v1.84.19; not universal protocol compliance.                                                                                                                                                                                                                                                      |
| Reliability          | PASS WITH LIMITATIONS     | Partial failure, cancellation, concurrent ownership, stream stalls and bounded cleanup tested. Hard process death cannot guarantee cleanup.                                                                                                                                                                                                                  |
| Packaging            | PASS                      | Offline packed installation executes version/list/doctor/check/report/export/verify/plan/quiet.                                                                                                                                                                                                                                                              |
| Developer experience | PASS WITH LIMITATIONS     | Independent fresh consumer flow passes; external user demand and broad usability remain unvalidated.                                                                                                                                                                                                                                                         |
| Documentation        | PASS WITH LIMITATIONS     | Local file links and command recipes checked; not every external link or browser rendering is certified.                                                                                                                                                                                                                                                     |
| Reporting            | PASS WITH LIMITATIONS     | Schema validation, malformed input, exclusive output and complete bundle tamper detection pass; integrity is not authorship.                                                                                                                                                                                                                                 |
| CI                   | PASS                      | Local formatting/syntax/docs/22 tests/demo/package checks pass. Remote Node 22/24 fast CI passed after an offline-cache fix: [40756755065](https://github.com/phlppgdfry/storage-doctor/actions/runs/40756755065). Linux service and composite Action workflow passed: [40754252153](https://github.com/phlppgdfry/storage-doctor/actions/runs/40754252153). |
| Architecture         | PASS WITH LIMITATIONS     | Small transport/schema/scenario/report boundaries and SDK signing; no speculative plugin framework.                                                                                                                                                                                                                                                          |
| Open source          | PASS WITH LIMITATIONS     | Contributor templates and security policy present; GitHub private vulnerability reporting enabled and read back true.                                                                                                                                                                                                                                        |
| Product value        | PASS WITH LIMITATIONS     | Concrete local cross-protocol diagnostic/replay workflow; adoption, novelty and demand unproven.                                                                                                                                                                                                                                                             |
| Publication          | PASS for source candidate | Authenticated owner confirmed; new empty public repository created without overwriting content. Full baseline history and candidate reviewed; pattern scan found no credentials. npm publication not authorized.                                                                                                                                             |

Public repository: https://github.com/phlppgdfry/storage-doctor. The GitHub source release is prepared from the verified candidate; npm is not published and needs separate authorization. npm lookup returned E404 for storage-doctor on 2026-10-28; this does not reserve ownership.

## Local release procedure

1. Work on a focused branch with a clean, reviewable diff. Preserve historical example evidence.
2. Install locked dependencies with `npm ci`.
3. Run formatting, automated tests, fixture demo, package smoke installation and documentation checks advertised by the current package scripts. Record actual commands, versions and results.
4. Start only the dedicated local Supabase project. Run integration, inspect failed or inconclusive cases, verify owned-resource cleanup and stop the same stack afterward.
5. Generate a fresh example report and evidence bundle. Verify checksums, review the files for credentials and execute the documented replay against a newly provisioned disposable target. A recipe alone is not verified reproduction.
6. Read the diff skeptically: protocol assumptions, backward compatibility, error classification, timeouts, cleanup and output paths. Resolve P0 findings before adding optional features.
7. Check the packed file list. Confirm the installed CLI, documentation and examples agree. Check npm-name availability before planning distribution; availability does not reserve ownership.

## Public GitHub procedure

The owner authorizes a public repository under `phlppgdfry` when critical gates pass. This does not authorize overwriting another repository, force-pushing, deleting existing content, npm publication or external announcements.

1. Verify the authenticated account and whether `phlppgdfry/storage-doctor` already exists. Inspect existing content before deciding any remote configuration.
2. Review **all commits and tracked files**, including old example reports, generated assets and deleted files still reachable from history. Scan for credentials and inspect findings rather than trusting a scanner's absence of matches.
3. Confirm a private security-reporting route. GitHub private vulnerability reporting should be enabled and its reporting page checked. Do not advertise the route until it exists.
4. Create or prepare the public repository only if no critical blocker remains. Push normally; never force-push. Record the actual URL and SHA after success.
5. Inspect fast CI results. Trigger local-service integration CI separately. Keep pending checks visible; do not publish a verified-release claim while they are unresolved.
6. Create a version tag or GitHub release only for a verified commit with reviewed release notes. A public source repository can exist before a release; say which state it is in.

If authentication, account ownership, private reporting or CI cannot be verified, report the precise blocker and retain the local candidate. Never work around a publication approval failure.

## Compatibility policy

0.2.0 introduces report schema v2. Existing v1 examples remain historical evidence. Import behavior must be explicitly documented: accept only supported versions through validated conversion or reject them with an actionable message. Never silently reinterpret a v1 run as a v2 execution.

Status and exit-code changes must be listed in the changelog. FAIL describes a failed diagnostic observation, ERROR a harness failure, and INCONCLUSIVE insufficient target evidence. None is an automatically confirmed vendor defect.

## After initial publication

Ask for feedback on a specific local workflow. Record actual setup friction and report usefulness before building AI, adaptive testing or more providers. Keep announcements manual and avoid compatibility, performance or hiring claims that the evidence does not support.

## v0.3.0 local candidate — current work

The sections above are the preserved **v0.2.0 historical decision**, not authorization to publish or current v0.3.0 gate results. Current owner instructions require explicit approval before any push, public issue/PR, npm publication or release change. The existing v0.2.0 GitHub draft and its assets are untouched.

0.3.0 is justified by additive offline comparison, packaged demo and Action baseline/summary features. Existing report schema 2, diagnostic scenarios and check exit semantics remain. Baseline comparison deliberately refuses different diagnostic builds; this limitation is documented rather than hidden behind schema migration.

Distribution: continue with a reviewed GitHub source/tag and checksumed npm-format archive, plus the SHA-pinned Action for workflows with a provisioned disposable service. Direct GitHub dependency installation has weaker lockfile reproducibility; prefer the reviewed archive. npm lookup returned E404 on 2026-10-29; this neither reserves the name nor proves ownership. No public npm installation recipe is advertised. If npm distribution is separately approved later, verify ownership and registry provenance support in the chosen release environment before publishing. No provenance attestation was generated here; SHA-256 is integrity, not identity.

Do not publish v0.2.0 merely as a prerequisite: 0.3.0 does not depend on a previous GitHub release. If a public milestone is wanted, first decide whether to publish the already validated 0.2.0 unchanged or wait for 0.3.0 hosted CI and user sessions. Keep either decision explicit and preserve the draft's existing evidence.

### Current v0.3.0 gates (follow-up audit)

| Category                    | Decision              | Evidence / boundary                                                                                                                        |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Correctness                 | PASS WITH LIMITATIONS | 31 tests on Node 22/24; two final-source real Supabase runs 10/10 each. Existing narrow assertions only.                                   |
| Security                    | PASS WITH LIMITATIONS | Existing security regressions, changed-path author review and production audit 0; no independent external audit.                           |
| Reliability                 | PASS WITH LIMITATIONS | Negative tests, authorization/cleanup/cancellation paths; no crash recovery or production reliability evidence.                            |
| Reproducibility             | PASS WITH LIMITATIONS | Same-source real rerun and comparison; corruption detector; bundle hashes; no independent-human reproduction.                              |
| Developer experience        | PASS WITH LIMITATIONS | Fresh-cache consumer and zero-credential installed demo; no independent users, visual browser opening blocked.                             |
| Packaging                   | PASS                  | Installed eleven-command consumer flows, Node 22/24, fresh cache install, version/fingerprint consistency and reviewed file list.          |
| CI integration              | PASS WITH LIMITATIONS | Actual shell blocks in independent consumer with injected failure; actionlint passes. Hosted runner/artifact path for v0.3.0 NOT VERIFIED. |
| Documentation               | PASS WITH LIMITATIONS | Local links, source contracts, usable recipes and real snapshots; external users and browser rendering pending.                            |
| Open-source maintainability | PASS WITH LIMITATIONS | No runtime dependency addition; pinned actions, contributor/security/release instructions; human review pending.                           |
| Product differentiation     | PASS WITH LIMITATIONS | Narrow multi-protocol evidence + conservative comparison; existing tools acknowledged, novelty/demand not established.                     |
| User value                  | NOT VERIFIED          | Concrete automated workflow; two-developer protocol prepared, no actual user outcomes.                                                     |
| Release readiness           | NOT VERIFIED          | Local RC prepared. Obtain review, explicit push permission, current hosted Node/service/Action CI, and owner release decision.             |

Exact execution commands/results and limits are in [validation](../validation.md). This is intentionally not an unconditional “ready” declaration. No open critical issue was found locally, but missing evidence remains missing.

Before publication: inspect the local diff including the preserved user edit, commit the approved candidate, get explicit push permission, run the hosted consumer workflow with its actual reviewed 40-character SHA, review artifacts, and obtain explicit release/package publication approval. The consumer workflow is ready for a separate repository; it uses no undocumented consumer files and does not claim an unpushed v0.3.0 tag exists. Prefer obtaining the two user sessions before a broad launch.

### Final follow-up decision: CONDITIONAL GO for review, not publication

The candidate now verifies bundle integrity before CLI comparison, requires a declared live auth context, rejects conflicting timestamps/fingerprints and unsafe evidence file types, and escapes imported replay prose. Historical schema conversion still works; a temporary regression introduced by the stricter import check was detected and fixed, not suppressed. The actual capture and latest real snapshot match the final source fingerprint. No storage assertion, runtime dependency or safety scope was expanded.

Review [compare](../../src/compare.js), [strict imports](../../src/schema.js), [bundle verification/rendering](../../src/report.js), [configuration](../../src/config.js), [CLI](../../src/cli.js), [regression tests](https://github.com/phlppgdfry/storage-doctor/blob/v0.3.0/test/compare.test.js), [security tests](https://github.com/phlppgdfry/storage-doctor/blob/v0.3.0/test/security.test.js), and the actual [recording script](https://github.com/phlppgdfry/storage-doctor/blob/v0.3.0/scripts/record-demo.js). Supporting changes are package/demo/Action-consumer helpers, Action inputs/summary, the Node matrix and PR-triggered local-engine workflow, README/configuration/contracts/changelog, and preserved example evidence. Inspect the complete branch diff, not just these highlighted files.

Hosted current-branch Node 22/24, real Action execution and artifact upload: **NOT EXECUTED**. Local shell consumer results are not substituted for those gates. The service workflow is now prepared to run on relevant pull requests, as well as manual dispatch. No remote branch, PR, tag, release or metadata setting has been created or changed in this follow-up.

Source/version consistency: package.json, lockfile and src/version.js all declare 0.3.0. A local review commit records the candidate after the full diff/history/package scan. No v0.3.0 release tag is claimed; final tag-to-source verification must happen against the approved hosted commit before release. The existing v0.2.0 draft and artifact digests remain unchanged. Local archives are prepared under ignored reports/release-v0.3.0-rc2; older candidate artifacts remain intact.

Outstanding actions, in order:

1. **Owner authorization:** allow pushing only work/v0.3.0-regression-evidence and opening a draft PR. No merge, release publication, npm publication or external contact is included.
2. Inspect hosted Verify Node 22/24 jobs and the real service/Action workflow for that exact SHA. Fix confirmed failures locally and request/retain appropriate push authorization for corrections. Download and verify artifacts before claiming success.
3. **External participants/owner coordination:** run the existing two-developer usability protocol. No testers were contacted and no feedback was invented. Independent human code review also remains outstanding.
4. **Separate owner authorization:** after review and hosted gates, create a reviewed release/tag. npm requires an additional separate decision and verified name ownership. Do not alter the v0.2.0 draft as a side effect.

Safe local implementation and validation are complete for this scope. This is not production, universal S3, external security or market certification. The next blocking action is publication of the review branch, which the owner explicitly reserved for approval.

### Current gate — 2026-10-30 revalidation

Re-inspection found a clean expected RC2 commit `8f5b5ed68b88ceb198a6cfc98f66bb3f10ab7b44`. GitHub still exposes only main at `d0054a8`; no current-branch PR/run exists, and the v0.2.0 draft/assets are unchanged. Earlier tables are historical assessments. This table uses PASS / FAIL / NOT EXECUTED / NOT APPLICABLE; each PASS is limited to its stated evidence.

| Gate                                                                        | Status         | Actual evidence / boundary                                                                                                                                                                 |
| --------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Correctness and test reliability                                            | PASS           | 32/32 tests, no skips, Node 22.23.4 and 24.22.2; deterministic fixtures plus the newly reproduced checkout-with-spaces regression.                                                         |
| Security controls                                                           | PASS           | Existing adversarial tests, no runtime control changes, current production npm audit zero; auth context is a declaration, checksums are integrity only. No external certification implied. |
| Independent human security/code review                                      | NOT EXECUTED   | No reviewer contacted or feedback invented.                                                                                                                                                |
| Local package consistency                                                   | PASS           | Versions stay 0.3.0, no new dependency; offline installed eleven-command flow passes on Node 22/24. Fresh and exact-archive results are retained with current artifacts.                   |
| Local Action consumer                                                       | PASS           | Success, corruption, two invalid configurations, no-network setup rejection, log/JSON/Markdown/HTML redaction and summaries pass on Node 22/24.                                            |
| Real local integration                                                      | PASS           | New disposable Supabase v1.84.19 run 10/10, no cleanup warnings; verified comparison with retained RC2 snapshot returns no-regression/0.                                                   |
| Reproducibility                                                             | PASS           | Engine fingerprint unchanged; retained real snapshot and actual 45-second capture still match it. No evidence or recording was overwritten.                                                |
| Documentation consistency                                                   | PASS           | Review packet, source/installed instructions, protocol/limits, artifact roundtrip example and prioritized conditional roadmap; local links and workflow syntax checked.                    |
| Hosted Node 22/24 CI                                                        | NOT EXECUTED   | Explicit push/PR approval is still absent; old main successes do not count.                                                                                                                |
| Distributed Action, upload/download/verification and cancellation on GitHub | NOT EXECUTED   | Consumer roundtrip is prepared and syntax-checked, not a hosted result.                                                                                                                    |
| External usability                                                          | NOT EXECUTED   | Two-reviewer tasks and feedback form prepared; actual participants/outcomes absent.                                                                                                        |
| Public v0.3.0 tag/source mapping                                            | NOT EXECUTED   | No public tag or release is authorized or claimed. Local source/manifest mapping is retained.                                                                                              |
| npm publication/provenance                                                  | NOT APPLICABLE | No npm publication is requested or authorized for this candidate.                                                                                                                          |

Confirmed new blocker triage: **P1 fixed** — `scripts/integration.js` passed URL.pathname (`%20`) instead of a decoded filesystem path to Supabase CLI when the checkout name contains spaces. A controlled stub reproduced the failure before the fix and passes after `fileURLToPath`; it exits before network/storage access. **P2 completed** — missing consolidated reviewer packet, omitted negative consumer cases and absent artifact roundtrip instructions. No newly confirmed P0 was found in this scoped review. A label or secret-pattern scan cannot establish the absence of every possible vulnerability.

Changed files: `scripts/integration.js` plus `test/integration-helper.test.js` for the root-cause fix; `scripts/action-consumer-smoke.js` for missing-input/redaction checks; `examples/consumer-workflow.yml` for read-only retrieval of this exact run's artifact and verification; `docs/review.md` for independent installation/tasks/expectations/security/questions/feedback; README, CONTRIBUTING, roadmap and dated validation/release records for discoverability and accurate gates. No diagnostic assertion, comparator semantics, runtime dependency, source fingerprint, existing report or recording changed.

**Final decision: CONDITIONAL GO for an authorized review branch/draft PR.** Full release readiness remains conditional on current hosted Node/service/Action gates, artifact retrieval/verification and independent review. Do not claim production readiness or completed external usability. The only remaining execution that can close the hosted gates requires explicit authorization: push this existing branch normally, open a draft PR, inspect the exact tested SHA and fix real failures. Merge, npm publication, a GitHub release and external reviewer contact remain separate approvals. The prioritized post-gate queue is in [roadmap](../roadmap.md); no feature work is needed to fill the missing external evidence.
