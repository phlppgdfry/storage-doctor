# Release readiness and process

Recommended candidate: **0.2.0**, reflecting a report-format and safety upgrade from 0.1.0. This document is a release gate, not a claim that a release or remote CI run exists.

## Candidate quality gates

Local critical gates passed before initial source publication. This is a source release candidate until remote CI is inspected. Evidence is in [validation](validation.md), the [audit](upgrade-audit.md) and the checked-in [real-run snapshot](../examples/v0.2.0/report.json).

| Category             | Decision                  | Evidence and limitation                                                                                                                                                                                          |
| -------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security             | PASS WITH LIMITATIONS     | 12 independent security regressions pass; no unresolved critical finding in reviewed paths. Not external certification; tunnels/host compromise excluded.                                                        |
| Correctness          | PASS WITH LIMITATIONS     | Ten source-backed scenarios pass on current local Supabase v1.84.19; not universal protocol compliance.                                                                                                          |
| Reliability          | PASS WITH LIMITATIONS     | Partial failure, cancellation, concurrent ownership, stream stalls and bounded cleanup tested. Hard process death cannot guarantee cleanup.                                                                      |
| Packaging            | PASS                      | Offline packed installation executes version/list/doctor/check/report/export/verify/plan/quiet.                                                                                                                  |
| Developer experience | PASS WITH LIMITATIONS     | Independent fresh consumer flow passes; external user demand and broad usability remain unvalidated.                                                                                                             |
| Documentation        | PASS WITH LIMITATIONS     | Local file links and command recipes checked; not every external link or browser rendering is certified.                                                                                                         |
| Reporting            | PASS WITH LIMITATIONS     | Schema validation, malformed input, exclusive output and complete bundle tamper detection pass; integrity is not authorship.                                                                                     |
| CI                   | NOT VERIFIED remotely     | Local formatting/syntax/docs/22 tests/demo/package checks pass. Remote Node 22/24 and service/Action workflows pending inspection.                                                                               |
| Architecture         | PASS WITH LIMITATIONS     | Small transport/schema/scenario/report boundaries and SDK signing; no speculative plugin framework.                                                                                                              |
| Open source          | PASS WITH LIMITATIONS     | Contributor templates and security policy present; GitHub private vulnerability reporting enabled and read back true.                                                                                            |
| Product value        | PASS WITH LIMITATIONS     | Concrete local cross-protocol diagnostic/replay workflow; adoption, novelty and demand unproven.                                                                                                                 |
| Publication          | PASS for source candidate | Authenticated owner confirmed; new empty public repository created without overwriting content. Full baseline history and candidate reviewed; pattern scan found no credentials. npm publication not authorized. |

Public repository: https://github.com/phlppgdfry/storage-doctor. No GitHub release or npm publication is implied by creation of the source repository. npm lookup returned E404 for storage-doctor on 2026-10-28; this does not reserve ownership.

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
