# Product decision: a narrow diagnostic CLI

Reviewed 2026-10-28. This document distinguishes source evidence from product hypotheses.

## Existing work

| Tool                                                                                              | Existing purpose                                | Decision                                                                |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| [MinIO Warp](https://github.com/minio/warp)                                                       | S3 benchmarking                                 | Do not implement a load generator or advertise speed improvements       |
| [Ceph s3-tests](https://github.com/ceph/s3-tests)                                                 | S3 compatibility tests                          | Do not claim comprehensive S3 compliance                                |
| [MinIO Mint](https://github.com/minio/mint)                                                       | Correctness checks using clients and SDKs       | Do not duplicate a multi-SDK matrix                                     |
| [MSST-S3](https://github.com/linux-kdevops/msst-s3)                                               | Broad S3 interoperability suite                 | Borrow no test-count or completeness claims; choose a narrower workflow |
| [Ozone compatibility dashboard](https://ozone.apache.org/blog/2026/06/27/ozone-s3-compatibility/) | Daily, searchable results from existing suites  | Reports and searchable results are not novel by themselves              |
| [Supabase Storage](https://github.com/supabase/storage)                                           | Existing unit, integration and acceptance tests | Extend investigator ergonomics, not a claim that upstream lacks tests   |

The local upstream checkout was inspected read-only at `3bbc971796fe9907a030c4fc70a07d440930d7b2`. Relevant paths: `acceptance/specs/s3.test.ts`, `acceptance/specs/s3-wire.test.ts`, `acceptance/specs/tus.test.ts`, `src/test/s3-protocol.test.ts`, `src/test/tus.test.ts`. Existing TUS acceptance tests already cover REST download after resumable upload. **Cross-protocol testing is not a new invention here.**

## Evidence of a problem domain

[Supabase's compatibility contract](https://supabase.com/docs/guides/storage/s3/compatibility) explicitly describes interoperability. Its [self-hosted S3 troubleshooting](https://supabase.com/docs/guides/self-hosting/self-hosted-s3) describes signature/configuration and TUS problems. The [issue tracker](https://github.com/supabase/storage/issues) contains reports involving metadata, range responses, local TUS and protocol configuration. This supports investigating diagnostics, not evidence that developers want this particular tool.

Actual user interviews, external installs, retained usage and willingness to contribute have **not** been validated. Novelty and future popularity are unknown. A bounded read of public pages is not an exhaustive competitor or issue-duplication search.

## MVP options

| Option                                  | Effort       | Differentiation                                | Immediate evidence                    | Maintenance                         |
| --------------------------------------- | ------------ | ---------------------------------------------- | ------------------------------------- | ----------------------------------- |
| A. Local CLI with ten checks and export | Low/moderate | Diagnosis/replay ergonomics, still unvalidated | First useful live run                 | Small surface                       |
| B. Stateful cross-protocol framework    | High         | Potentially useful sequences                   | Needs a known hard failure and oracle | Protocol/model complexity           |
| C. Autonomous AI research platform      | Very high    | Not established                                | No baseline showing improvement       | Evaluation, budget and model burden |

**Decision: A**, with five cross-protocol checks alongside five S3 controls. This is a justified bounded engineering experiment, not proof of product-market fit. Reuse the AWS SDK for signing and transport; use standard HTTP for the small REST/TUS surface. Avoid source-code duplication, AI dependencies, accounts and a hosted backend.

## First useful developer workflow

“My locally configured Supabase Storage accepts S3 uploads. Can REST read the same bytes? Can I share the precise failing operation without sharing my service key?”

Run a named scenario, inspect its report, rerun it with the same seed against a fresh namespace, export it for review. A maintainer still needs semantics, version matching, duplication checks and root-cause evidence before treating it as an upstream defect.

## Demand validation

After explicit publication approval, ask a small number of self-hosting developers to execute a documented local workflow. Record setup blockers, time to usable report and whether the report helps solve a real problem. Get consent before recording feedback. Do not contact people automatically.

Continue only if external users can run the tool and at least one can describe a concrete diagnostic or regression-testing benefit. If the existing upstream acceptance harness is equally convenient, prefer contributing improvements there. Do not spend months building a second platform to justify the original idea.

## v0.3.0 decision — 2026-10-29

Re-read primary project pages: [Warp](https://github.com/minio/warp), [Mint](https://github.com/minio/mint), [Ceph s3-tests](https://github.com/ceph/s3-tests) and [Supabase acceptance](https://github.com/supabase/storage/tree/master/acceptance). Their documented purposes still support the existing comparison above. This is a bounded review, not a claim that competitors cannot compare results. Storage Doctor's useful combination is a small local REST/S3/TUS diagnosis, explicit uncertainty, and portable evidence with a conservative CI gate. Choose the upstream suite for deep implementation coverage, Ceph for broad S3 behavior, Warp for load/performance, and Mint for client/SDK correctness. Existing reliability/fault tools cover a much broader domain; adding a fault framework here lacks a demonstrated storage failure.

Scores below are engineering judgments, not measured demand. Scale 1–5; higher is better for impact/technical value/differentiation/reproducibility/distribution/portfolio and worse for effort/maintenance/security risk/uncertainty. Vector order: **impact, technical, differentiation, reproducibility, effort, maintenance, risk, distribution, portfolio, uncertainty**. No numerical adoption probability is defensible without users.

| Candidate                     | Problem / alternative                                                                                                       | Score vector        | Decision, infrastructure and limits                                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Deterministic reproduction | Share a repeatable failure; existing seeded scenarios and export already do most of this                                    | 3,3,2,5,3,3,2,3,4,3 | P2: retain seeds/recipes. Schedule replay needs a real timing failure; local engine + fixture. Adoption utility uncertain beyond current export.                                                                       |
| B. Automatic shrinking        | Reduce an unwieldy failure; manual named scenarios already small                                                            | 2,4,3,2,5,5,4,2,4,5 | P3: no demonstrated shrinkable failure. Repeated mutations risk changing semantics; needs stable failing engine and an independent oracle.                                                                             |
| C. Differential S3            | Find provider differences; Ceph and existing suites cover broad S3 behavior                                                 | 3,4,2,3,5,5,4,3,4,4 | P3: multiple engines, protocol support matrix, duplicated data and cleanup. Differences need contract review; no demand evidence.                                                                                      |
| D. Stateful cross-protocol    | Find transition bugs; current overwrite/delete/TUS cases already exercise state                                             | 4,5,4,3,5,5,4,3,5,4 | P3: only add a focused sequence after a real missed failure; requires fault fixtures and real-engine reproduction.                                                                                                     |
| E. CI regression detection    | Detect PASS→FAIL after a target change without treating unavailable or partial evidence as green; manual JSON diff is noisy | 4,4,3,5,2,2,1,4,4,2 | **P1 selected**: offline validated comparison, same build/inputs/selection, healthy baseline. Fixture fault injection + distinct runs + real target snapshots. Plausible integration-test use, not validated adoption. |
| F. Setup detection            | Avoid confusing bad configuration with defects; existing doctor already validates local config                              | 3,3,2,4,2,2,2,4,3,2 | P1 narrow DX: installed demo needs no credentials; retain non-network doctor. Remote credential probing deferred; fixtures and clean package consumer suffice.                                                         |
| G. Explanations               | Help readers act on findings; existing expected/reason/reference fields already explain contracts                           | 4,3,2,4,2,2,1,4,3,3 | P1 narrow DX: comparison next steps and Action status summary. Defer speculative root cause and AI; report imports + summary consumer tests.                                                                           |

No unresolved P0 was found in the reviewed changed paths. P1 release scope is E plus the narrow DX/summary work. P2: collect two observed user sessions, then improve explanations based on actual misunderstandings. P3: focused fault/retry research after finding a reproducible use case. REJECT for this milestone: separate branded modes, a universal minimizer, autonomous AI, hosted dashboards, adaptive claims and more providers. These add maintenance/security surface before demonstrating utility. The fixed planner remains unchanged; no strategy outperformed a fixed baseline in a controlled evaluation.

## Two-developer validation protocol

Recruit only after owner approval: one Supabase-experienced developer and one developer unfamiliar with Storage Doctor. Do not coach before the first attempt. Record consent, OS/Node, exact artifact SHA-256, commands, timestamps, assistance, outcomes and sanitized errors. No sessions have been performed; the clean-room automation is not user feedback.

1. **Five-minute onboarding:** find prerequisites and installation from README, install the reviewed archive, run `storage-doctor demo`, open its HTML. Record elapsed time, step count and blockers. Ask whether this tested Supabase and whether production is allowed. Success requires correct answers: fixture only; disposable literal loopback only.
2. **Reproduction:** run `storage-doctor demo --inject-corruption --out FAILED`, recognize expected exit 1, export `rest-to-s3`, verify its bundle and independently rerun the fixture. State that a real engine needs separately provisioned credentials. Record task completion and assistance.
3. **Interpretation:** compare healthy and corrupted demo reports. Explain exit 1 versus an unavailable/mismatched report's exit 2. Identify expected bytes, observed assertion, cleanup and next investigation. Success requires no claim of a confirmed vendor defect.
4. **Experienced-user extension:** follow the local Supabase recipe and obtain a real report; record prerequisite work separately from CLI time. Never use a production endpoint.

Questionnaire: Where did you hesitate? Which finding would change your next debugging step? What was missing from the evidence? Would your own integration tests be easier? Which actual task would bring you back?

Defect template: artifact/version; OS/Node; task; expected outcome; exact sanitized command; actual outcome/exit; elapsed time; assistance; report checksum; reproducibility; impact. Never include credentials. Keep an empty results table until people participate. Create public issues only with explicit authorization and actual findings.
