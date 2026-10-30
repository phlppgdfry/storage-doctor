# Validation record

2026-10-28. Local macOS arm64, Node v24.21.0, Supabase CLI 2.122.0.

## Live target

- Dedicated CLI project `storage-doctor`, API on `127.0.0.1:55431`.
- Supabase Storage image `public.ecr.aws/supabase/storage-api:v1.84.19`.
- Downloaded storage image repository digest: `sha256:a0420573837ee08c0afdc9cd01f90b4b8027579da99e0b9a159fe912ef756c99`.
- PostgreSQL image `public.ecr.aws/supabase/postgres:17.11.0.006`.
- Upstream source checkout inspected separately at `3bbc971796fe9907a030c4fc70a07d440930d7b2`; this is **not** claimed to be the image source SHA.
- Private unique bucket, local privileged credentials and filesystem-backed Storage via the CLI stack.

The initial live run passed nine checks and rejected the composite Unicode/percent filename with HTTP 400. Investigation of [documented filename restrictions](https://supabase.com/docs/guides/storage/uploads/file-limits) showed the assertion expected behavior outside the supported character set. The test assumption was corrected to supported spaces and URL-sensitive ASCII characters. The original report remains locally in `reports/initial-contract-review/report.json`; it is not a confirmed finding.

Two corrected live runs against separate fresh buckets each passed **10/10** scenarios with **zero cleanup warnings**, including the 6 MiB TUS chunk followed by offset query, final PATCH and byte comparison through REST and S3. Structured evidence is generated locally at `reports/integration/report.json`; Markdown, offline HTML and SHA-256 checksums are beside it. Reports are ignored by Git by default.

A sanitized snapshot of the second live run is included at [examples/verified-supabase/report.json](../examples/verified-supabase/report.json), with its HTML/Markdown report and checksums. Run IDs differ between repetitions; payload seed and target version agree. The first successful run is retained locally in `reports/verified-run-1/report.json`.

## Harness verification

The final harness suite passed **10/10 tests**. Wire-level fixture checks validate clean roundtrips, corrupted-byte detection, authorization uncertainty, cleanup failures, profile exclusions and malicious TUS resource locations. Configuration tests reject external destinations and URL credentials. Export tests preserve original observations and generate a replay recipe. A budget test prevents new exploration requests while permitting cleanup.

The fixture deliberately does not validate SigV4 signatures, emulate PostgreSQL, enforce RLS or stand in for Supabase. Live integration is separate evidence.

The first sandboxed test attempt could not bind a loopback socket (`EPERM`). The same suite was run outside that restriction, using only ephemeral local HTTP ports. This was an environment restriction, not a target failure.

## What is not established

- No new vendor bug or security issue is confirmed.
- No upstream maintainer has reviewed or adopted Storage Doctor.
- No production performance or end-user RLS guarantees were tested.
- No other S3 implementation or operating system is verified yet.
- GitHub Actions definitions exist; remote CI has not been run.
- No independent external reproduction or validated user demand exists yet.
- No hidden-evaluation result or measurable self-improvement is claimed.
- The HTML artifact has rendering/escaping checks in the harness; native browser inspection was blocked by the browser's local-file URL policy.

Re-run all commands from README to generate fresh observations. Ten passing scenarios establish only those specific checks under the recorded configuration.

## 0.2.0 upgrade verification

The baseline was independently re-run before edits on Node v24.21.0 / npm 12.1.0 / macOS arm64 with Supabase CLI 2.122.0: ten harness tests and the original package smoke passed.

The upgraded local suite passes **22 tests**, including **12 independently authored security regressions**. Separate review reproduced the baseline ambient-proxy canary and verified the fix using only loopback traffic and generated credentials. Tests cover oversized error XML before SDK parsing, stalled bodies, hostile/nested report fields, symlinks, tampering, cancellation and concurrent ownership. No unresolved critical finding remains in reviewed paths.

Two upgraded all-scenario runs against Supabase Storage v1.84.19 each passed **10/10**, with no cleanup warnings. The latest source-fingerprinted snapshot is retained in [examples/v0.2.0](../examples/v0.2.0/report.json); old schema 1 evidence is untouched.

Both the integrated smoke and an independent fresh offline consumer executed doctor/list/check/report/export/verify/plan through the installed binary. The independent consumer's core fixture checks passed 3/3; fixtures are not vendor compatibility evidence. Local full CLI package smoke also exercised JSON and quiet output.

A real-run rest-to-s3 bundle was exported and its five evidence files verified. Named replay against a fresh dedicated local bucket is recorded in the upgrade logs; it is not proof of an independent upstream finding.

Pattern scan and manual review covered all 31 historical blobs plus the tracked candidate before initial push, with no credential findings. Pattern scanning is not an assurance against every possible secret representation. A dependency audit returned zero reported production vulnerabilities at the time of the check; this is registry evidence, not a complete security assessment.

Five local help-start samples varied between 102 and 1749 ms; five HTML-render samples varied between 0.106 and 0.666 ms on this busy host. This small noisy sample does not justify a speed claim or architecture change. Parent RSS was about 74 MB, not measured child peak memory. The packed artifact size from the clean-consumer check was about 43 KB before final documentation updates; exact release size is recorded by the final package check.

Remaining limitations: external developer demand unvalidated; no hostile-kernel/tunnel protection; no production/RLS/load/crash-recovery coverage; no other provider validation; HTML has semantic/escaping checks but no independent visual/accessibility certification. Remote CI and Action status are recorded separately in [release readiness](release.md).

### Remote Linux validation

[Service and composite Action run 40754252153](https://github.com/phlppgdfry/storage-doctor/actions/runs/40754252153) passed on Linux/x64: all ten real Supabase scenarios, a three-check core Action run, exact owned-resource cleanup and artifact upload. The checked-in 0.2.0 snapshot now comes from that run; its source fingerprint was compared to the local candidate and matched. The prior macOS snapshots remain in local upgrade evidence.

The initial [fast CI run](https://github.com/phlppgdfry/storage-doctor/actions/runs/40753324276) failed its Node 24 offline-consumer step with ENOTCACHED: npm ci had cached package archives without the metadata a fresh install resolution expected. The smoke now constructs a consumer lockfile from the audited dependency graph and uses npm ci --offline; it does not drop offline validation. Local replay of that fixed consumer passed. Follow-up remote fast-CI evidence is recorded in release.md.

A direct IPv6 loopback request also passed on macOS. Cross-platform browser visual inspection remains unverified; no accessibility certification is claimed.

The fixed [Node 22/24 fast-CI run 40756755065](https://github.com/phlppgdfry/storage-doctor/actions/runs/40756755065) passed both jobs, including offline packed-consumer validation. This resolves the initial ENOTCACHED failure; no failing check was removed.

## v0.3.0 execution — 2026-10-29

Baseline `d0054a8` / tag v0.2.0 was freshly checked before editing: `npm run verify` passed 22/22 tests and ten fixture scenarios on Node 24.21.0. Sandbox listeners initially failed EPERM; the authorized host rerun passed. The pre-existing package smoke change to `--prefer-offline` was preserved. The older offline claims above describe historical runs, not today's changed smoke command.

Current candidate source and report versions are 0.3.0; report schema remains 2. `npm run verify` passes 26/26 tests and ten fixture checks on **Node 22.23.4** and **Node 24**. The shared Node 24 runtime changed from 24.21.0 to 24.22.2 during this session; the final suite was explicitly repeated on 24.22.2. An initial npx attempt still selected Node 24 and was not counted as Node 22 evidence. The real Node 22 run used the official nodejs.org darwin-arm64 archive, checked against SHA-256 `c9e1dbc748b33ed2d14f42445191ecaf14c56259c7a9a26d0042c49ec2b66428`, then an explicit PATH rooted at `/private/tmp/node-v22.23.4-darwin-arm64/bin`.

Commands (run from repository root):

```sh
npm run verify
PATH=/private/tmp/node-v22.23.4-darwin-arm64/bin:/usr/bin:/bin:/opt/homebrew/bin npm run verify
npm run package:smoke
PATH=/private/tmp/node-v22.23.4-darwin-arm64/bin:/usr/bin:/bin:/opt/homebrew/bin npm run package:smoke
npm run package:fresh
npm run action:smoke
PATH=/private/tmp/node-v22.23.4-darwin-arm64/bin:/usr/bin:/bin:/opt/homebrew/bin npm run action:smoke
npm audit --omit=dev --json
actionlint
actionlint examples/consumer-workflow.yml
node scripts/profile.js
git diff --check
```

### Real engine and reproduction

Docker Desktop 29.9.2 and Supabase CLI 2.122.0 started only this project's stack. `npm run integration` passed ten checks without cleanup warnings in each of three fresh buckets. The final same-source pair is:

- `reports/integration-9b38b385-250d-4f5b-beff-5289c1d0d56c`
- `reports/integration-7cddd577-8776-42cb-80f3-41eed592d3d6`

Both used `public.ecr.aws/supabase/storage-api:v1.84.19` on darwin/arm64. The earlier candidate run `b6573725-fa4d-4109-ac10-4a6a418768cd` also passed but has a different source fingerprint and was not used for comparison. The reviewed [v0.3.0 snapshot](../examples/v0.3.0/report.json) is the first final-source run; its source fingerprint matches current src modules. No historical example was overwritten.

```sh
node src/cli.js compare --baseline examples/v0.3.0/report.json --report reports/integration-7cddd577-8776-42cb-80f3-41eed592d3d6/report.json --json
node src/cli.js verify --report examples/v0.3.0 --json
node src/cli.js export rest-to-s3 --report examples/v0.3.0/report.json --out reports/v030-live-reproduction
node src/cli.js verify --report reports/v030-live-reproduction --json
```

Comparison returned `no-regression`, exit 0. Snapshot verification checked three hashed report files; reproduction export verified all five evidence files. The second real run independently executed the same scenarios against a newly provisioned bucket; this is not independent-human reproduction. `supabase stop` stopped only project `storage-doctor`, preserving its local backup. The CLI startup command printed local development credentials; they were not copied into any committed report or release artifact. Subsequent integration credential discovery remained in memory.

### Clean-room onboarding and package results

`package:fresh` creates a temporary consumer, no consumer lockfile, a private empty npm cache and no inherited SD_* configuration. It installs the reviewed tarball with lifecycle scripts disabled, then exercises the installed binary. It requires Node/npm and registry network access; it does not assume global storage-doctor, Docker, Supabase, test files or devDependencies.

All eleven flows pass: version, demo, compare, list, doctor, check, report, export, verify, plan and quiet. The dependency graph seeded smoke also passes on Node 22/24. A measured fresh-cache sample took **2,111 ms installation**, **209 ms demo execution**, **3,063 ms from packaging start to first fixture report**, **3,947 ms total**. These are one local automated sample, not a promise or an external-user measurement. Documentation added afterward changes package size; see final packed manifest for artifact bytes.

User path: four checkout commands (clone, cd, npm ci, demo), zero demo credential fields, and one manual HTML-open step. Reviewed-archive installation uses a separate directory, npm install of the exact archive and the installed demo command. Real integration additionally requires Docker, Supabase CLI and a service start/stop; the helper handles private bucket provisioning and credential lookup. Discovery, human comprehension and browser opening time were not measured. Documentation problems fixed: installed package lacked a demo; invalid selectors hid behind generic execution errors; argument errors with --json were not consistently JSON; the current smoke's offline claim was inaccurate.

The browser's URL security policy rejected the local file report. No workaround was attempted. Static report rendering and existing HTML/import security tests pass; visual browser rendering for this candidate is **NOT VERIFIED**. No two independent users participated. The protocol in product-validation.md is ready; no feedback/testimonials are invented.

### Action and security review

`action:smoke` copies the actual action sources into a temporary external-action directory and runs all five actual shell blocks from a separate consumer cwd. It passes three core fixture checks, a healthy comparison, three corrupt fixture checks with check/compare exit 1, success/failure summaries, missing-evidence summary and exact object cleanup on Node 22/24. `actionlint` passes repository workflows and the [separate-consumer example](../examples/consumer-workflow.yml). This validates consumer file independence and shell behavior; it does not execute GitHub's setup-node, condition evaluator or artifact service. **Current hosted CI/Action validation is NOT VERIFIED**, since no branch was pushed. Existing green GitHub runs are v0.2.0 history only.

Changed-path review checked: bounded strict imports before comparison; healthy baseline; mode/source/input/selection matching; incomplete-status precedence; property-order independence; ignored noisy timings; target upgrade visibility; existing owned cleanup; summary allowlisting; shell quoting via environment variables; credential-free fixture config; unchanged runtime dependencies. No unresolved critical finding was identified in this review. Fault tests demonstrate detection rather than merely mirroring implementation. This is an author review plus automated negative tests, not a separate security auditor or independent human code review.

`npm audit --omit=dev --json` reported **zero vulnerabilities** across 27 production packages at this execution. Locked license identifiers are MIT, Apache-2.0 and 0BSD; no dependency/license change was introduced. npm-name lookup returned E404, not ownership. GitHub private vulnerability reporting read back enabled; existing Action permissions/settings were inspected without changes. No release, package, branch, issue, PR or message was published.

### Efficiency observations

Final `node scripts/profile.js`, Node 24.22.2 darwin/arm64, five sequential samples: cold help **89, 87, 90, 88, 88 ms**; HTML render **0.655, 0.165, 0.152, 0.155, 0.111 ms**. Parent RSS was 82,264,064 bytes; this is not CLI child peak memory. An earlier sample had a 278 ms startup outlier. These noisy observations justify no optimization or target-performance claim. Network overhead/concurrency behavior was not benchmarked. The existing sequential budgets remain.

## Release engineering follow-up — final RC2 evidence

This supersedes the earlier local-candidate gates without overwriting their reports. Source assertions and runtime dependencies are unchanged; the follow-up tightens evidence handling and presentation. Work remains on `work/v0.3.0-regression-evidence`.

### Correctness and adversarial review

The CLI previously compared schema-valid files without verifying sibling manifests. It now verifies complete bundles and consumes the same bounded bytes that passed hashing. Missing/altered files or partial export manifests fail. Live auth equivalence was previously unknowable and unrecorded; a bounded explicit non-secret `SD_AUTH_CONTEXT` is now required for live comparisons. Actual policy equality remains an operator precondition, not something a label proves.

The test matrix covers PASS→FAIL/INCONCLUSIVE/UNSUPPORTED/SKIPPED/ERROR, FAIL→PASS/INCONCLUSIVE, lost-assurance precedence, missing/extra/reordered/duplicate scenarios, schema provenance/unknown versions, target version changes, auth context changes/absence, malformed/contradictory timestamps, per-result/run fingerprint conflicts, reproduction conflicts and impossible summaries. Target version changes alone are permitted; timing and ephemeral endpoint/bucket differences remain excluded from classification. No failed baseline is silently treated as healthy.

Security cases include owned namespace and concurrent-run isolation, preserved unrelated objects, cleanup after cancellation, exploration and cleanup exhaustion, proxy isolation, malicious TUS locations, stream deadlines, raw byte caps, traversal/partial manifests, report symlinks, FIFO inputs, forged evidence, tampered reproduction files, HTML escaping and replay Markdown escaping. Existing known fake fixture credentials are absent from serialized reports. There is no production endpoint, signature system, automatic replay execution or external AI transmission.

A temporary follow-up failure is retained in the execution history: the first canonical fingerprint validation rejected the `unrecorded` sentinel introduced by historical schema-1 conversion during re-rendering. Two existing security tests caught it. The sentinel is now accepted for historical rendering/verification, while comparison rejects unrecorded fingerprint provenance. Both historical tests pass again. No check was dropped or weakened to bypass the failure.

### Exact checks executed

```sh
npm run verify
PATH=/private/tmp/node-v22.23.4-darwin-arm64/bin:/usr/bin:/bin:/opt/homebrew/bin npm run verify
npm run package:smoke
npm run package:offline
PATH=/private/tmp/node-v22.23.4-darwin-arm64/bin:/usr/bin:/bin:/opt/homebrew/bin npm run package:offline
npm run package:fresh
npm run action:smoke
PATH=/private/tmp/node-v22.23.4-darwin-arm64/bin:/usr/bin:/bin:/opt/homebrew/bin npm run action:smoke
node --test --experimental-test-coverage test/*.test.js
npm audit --omit=dev --json
actionlint
actionlint examples/consumer-workflow.yml
git diff --check
gitleaks git --redact --no-banner --log-opts=--all
```

All **31 tests pass, zero skipped**, on Node **22.23.4** and **24.22.2**, macOS/arm64. Formatting/syntax/link checks and the ten-scenario fixture demo pass. Installed version/demo/compare/list/doctor/check/report/export/verify/plan/quiet flows pass. Offline installation is a new consumer with a prewarmed cache and npm `--offline`; it does not claim dependencies can appear from an empty cache without network. The existing default prefer-offline user change remains intact. Fresh-cache registry installation also passes; its recorded follow-up sample was 2,823 ms install and 191 ms demo, not a user benchmark.

Coverage was inspected for gaps rather than used as a release percentage target. The instrumented run passed 31/31 and exercised all comparator branches in that measured process. Uncovered branches remain in socket destination rejection, transport pre-abort/exception paths, malformed-body limits, some budget/warning paths and CLI orchestration. CLI subprocess consumer tests are separate execution evidence and are not fully merged into that coverage table. No universal correctness conclusion follows from coverage. The raw local coverage output is `reports/rc2-test-coverage.txt`.

### Real target and source-matched showcase

Supabase CLI 2.122.0, Docker 29.9.2, `public.ecr.aws/supabase/storage-api:v1.84.19`, only this project's disposable stack. Final-source runs:

- `reports/integration-a971d648-2dc7-4d07-b212-e1210624be22`: **10/10**, no cleanup warnings.
- `reports/integration-b996090e-bb75-40a9-af05-57fd65021a63`: **10/10**, no cleanup warnings.

```sh
npm run integration
npm run integration
node src/cli.js compare --baseline examples/v0.3.0-rc2/report.json --report reports/integration-b996090e-bb75-40a9-af05-57fd65021a63/report.json --json
node src/cli.js verify --report examples/v0.3.0-rc2 --json
npm run demo:record
```

The first is preserved as [RC2 real evidence](../examples/v0.3.0-rc2/report.json). Real comparison verifies both complete bundles and returns `no-regression`, exit 0, with declared `local-service-role` context. The previous v0.3.0 snapshot remains unchanged as history.

The actual [recording](../examples/showcase/regression.cast), [transcript](../examples/showcase/transcript.txt) and [metadata](../examples/showcase/recording.json) record approximately **45 seconds**, with actual exits **0,1,1,0,0**. Healthy fixture: ten passes; corruption: nine failures and one pass; comparison lists nine regressions; export/verification succeeds. Capture source, real snapshot and final src fingerprint match `88778a934fef9f49f963aed831eee66cc05d4545f784999220b8edf5d7ed2735`. This is timed stdout/stderr capture with scripted narration, not a screen video, human test session or vendor defect. The first preliminary capture is retained only under ignored reports/; the checked-in capture uses final sources.

### Security, distribution and remaining gates

Production npm audit reports zero vulnerabilities across 27 production packages at this audit time. The complete four-commit baseline history was scanned with gitleaks 8.30.1: no findings. The full nonignored current tree and final tarball receive redacted scans before the local review commit. Pattern scans are not certification or proof that every arbitrary disguised secret is absent. Startup logs containing disposable local keys stay outside evidence and are removed when stopping only this project's stack.

Local Action validation passes three healthy and three injected-failure fixture checks, exact exits, summaries after success/failure and missing-evidence behavior from a separate consumer directory on Node 22/24. `actionlint` validates workflows and the separate consumer example. Relevant PRs will trigger the prepared real-service workflow after publication. **Hosted current-branch CI, GitHub condition evaluation, real artifact upload, hosted cancellation and an independent consumer repository execution remain NOT EXECUTED.** Existing v0.2.0 GitHub successes do not satisfy these gates.

No independent reviewer or external developer has participated. The two-person usability protocol remains ready in product-validation.md; no feedback or task outcomes are fabricated. Windows development/test execution is unverified. Visual local-file browser validation remains policy-blocked; static report and import tests pass.

Verdict: **CONDITIONAL GO for an explicitly authorized draft PR; NO-GO for an unconditional production/release claim.** Source commit, packed manifest and checksums are retained with the local RC2 artifact; no v0.3.0 tag, GitHub release, npm publish, automatic merge, external contact or remote metadata change was performed.

## 2026-10-30 readiness revalidation

Started from clean `8f5b5ed` on the expected branch. Remote branches/PRs/releases/runs were re-read: only main `d0054a8` was published, no PR, v0.2.0 still draft with identical two asset digests. Existing passing runs [40772293837](https://github.com/phlppgdfry/storage-doctor/actions/runs/40772293837) and [40771923559](https://github.com/phlppgdfry/storage-doctor/actions/runs/40771923559) test that old main SHA, not this candidate. Original RC2 tarball SHA-256 still matches `fcb8ef49cf189a748fcac1f9cfb0081f418f398938ff7c385884f634bb6d448c`.

A fresh baseline `npm run verify` passed 31/31. Inspection found one new confirmed P1 source-helper issue: URL.pathname sent percent-encoded spaces in --workdir. A checkout copied into a path with spaces and a synthetic Supabase executable captured the exact CLI arguments and exited before any target operation. The new test failed with `%20` before the fix, then passed with `fileURLToPath`. The temporary-root symlink was resolved in the test so the assertion isolates URL encoding rather than /var versus /private/var aliases. No failure was suppressed.

Current executions:

```sh
node --test test/integration-helper.test.js
npm run verify
npm run package:offline
npm run action:smoke
PATH=/private/tmp/node-v22.23.4-darwin-arm64/bin:/usr/bin:/bin:/opt/homebrew/bin npm run verify
PATH=/private/tmp/node-v22.23.4-darwin-arm64/bin:/usr/bin:/bin:/opt/homebrew/bin npm run package:offline
PATH=/private/tmp/node-v22.23.4-darwin-arm64/bin:/usr/bin:/bin:/opt/homebrew/bin npm run action:smoke
npm run integration
node src/cli.js compare --baseline examples/v0.3.0-rc2/report.json --report reports/integration-3d2529b4-6399-49c9-a4e5-722b808eb130/report.json --json
npm audit --omit=dev --json
actionlint examples/consumer-workflow.yml
git diff --check
```

Final suite: **32/32, zero skipped**, on Node **22.23.4** and **24.22.2**, macOS/arm64. Formatting, syntax, links and fixture demo pass. Offline clean consumer (prewarmed dependency archive cache, no npm network) executes all eleven flows on both versions. Source helper fix does not change shipped src modules; the engine remains `88778a934fef9f49f963aed831eee66cc05d4545f784999220b8edf5d7ed2735`. Therefore the preserved real snapshot and actual capture remain source-matched; no new recording was fabricated to imply fresh human feedback.

The Action smoke now validates three healthy checks, three injected failures, unknown pack, missing bearer token, zero target requests for those invalid setups, successful-log and JSON/Markdown/HTML credential exclusion, and existing failure/missing-report summaries. Both Node versions pass. Its consumer remains a local shell exercise, not GitHub artifact/condition/cancellation proof. The separate workflow now requests only additional `actions: read`, selects its actual run ID and artifact name for `gh run download`, and verifies the retrieved bundle. Official [download semantics](https://cli.github.com/manual/gh_run_download) and actionlint were checked. No remote permission setting or workflow was run/changed.

Fresh real helper run: `reports/integration-3d2529b4-6399-49c9-a4e5-722b808eb130`, **10/10**, zero cleanup warnings, `public.ecr.aws/supabase/storage-api:v1.84.19`. Its complete bundle compared with the retained RC2 snapshot returns `no-regression`, exit 0. This is an unchanged-target repeat, not validation of a storage upgrade or a new defect. Only the dedicated project/ports were used. npm production audit again reports zero findings across 27 production packages; no dependency changed.

The [independent review packet](review.md) contains archive trust/installation, exact commands and expected exits, tamper/lost-assurance tasks, local security boundaries and blank feedback fields. The roadmap now records user problem, benefit, effort, risk, required evidence and proposed release for each conditional next item. Actual external usability and independent human review remain NOT EXECUTED. No remote branch, PR, release, npm publish or external message is authorized by these results. Current gate decisions are in release.md. Historical evidence, test failures, archives and recordings remain intact.
