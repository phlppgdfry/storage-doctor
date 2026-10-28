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
