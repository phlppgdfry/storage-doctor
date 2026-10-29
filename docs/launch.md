# Launch materials and technical case study

Draft materials. Publish only after the release gates pass. Replace any version/result statement with the final verified candidate evidence. Do not post these automatically.

## Positioning

**One sentence:** Storage Doctor checks local object-storage behavior across S3, Supabase REST and TUS, then produces evidence another engineer can inspect and replay.

**Short description:** Trust the bytes. Inspect the evidence. Storage Doctor is a local-first diagnostic CLI for developers working with Supabase Storage. It compares exact bytes and visible object state across protocols and exports offline reports. Core checks need no AI provider. It is a focused diagnostic tool, not a complete S3 certification suite or production benchmark.

## Technical announcement draft

I built Storage Doctor to make a small storage-debugging workflow easier to inspect: upload through one protocol, read through another, compare the actual bytes, and retain the request sequence and cleanup outcome.

The initial baseline includes S3 roundtrips, zero-byte objects, supported URL-sensitive keys, range reads, metadata and REST/S3/TUS interoperability. Tests run against an explicitly authorized disposable local target. Reports separate failed checks, unavailable evidence, excluded capabilities and harness errors. Exported evidence includes a replay recipe and integrity checks rather than an AI-generated certainty claim.

The project is early. It does not establish complete compatibility, production RLS safety, fault recovery or performance improvements. The fixture demo is labelled as a fixture; only recorded real-engine runs support the corresponding interoperability observations.

Useful feedback would be whether the setup is clear, whether the report helps diagnose a real local problem, and what evidence a maintainer needs before a finding is worth investigating. There is no confirmed new vendor bug or upstream endorsement to announce.

## Honest short demo

1. Show `storage-doctor --help` and `storage-doctor list` from an installed, packed candidate.
2. Show the validated local configuration and required permissions. Hide credentials before recording.
3. Run one real cross-protocol scenario against a dedicated disposable bucket. Show its actual exit code and cleanup outcome.
4. Open its generated offline HTML report. Expand the request details and point to expected versus observed behavior.
5. Export that scenario, verify bundle integrity and show the replay instructions.
6. Optionally run the fixture's controlled corruption demonstration. Keep “fixture / injected corruption” visible. Its expected failure demonstrates the detector, not a newly found storage bug.

Use the current README for exact commands. Do not splice together outputs from different target versions without making that visible. A recording should show a real completed run rather than fabricated terminal animation.

## Case study: when the test was wrong

The first Storage Doctor implementation included a compound object key with Unicode and a percent character. The first historical live run returned HTTP 400 for that scenario while the other nine passed.

A tempting interpretation would have been “new S3 compatibility bug.” Review instead found that the test expected behavior outside Supabase's [documented filename character set](https://supabase.com/docs/guides/storage/uploads/file-limits). The scenario was corrected to permitted spaces and URL-sensitive ASCII punctuation. The original result was retained as a rejected assumption; it was not converted into an upstream issue.

The corrected historical 0.1.0 suite passed ten scenarios twice against local Supabase Storage v1.84.19. These results support only those assertions under the recorded configuration. They do not prove universal interoperability, absence of bugs or production correctness.

The engineering lesson is that an oracle needs as much scrutiny as the system under test. Exportable evidence helps a reviewer discover when a claim is wrong. The hardening upgrade applies the same skepticism to the tool itself: destination scope, report imports, resource ownership, deadlines and distinctions between target failures and harness errors.

## FAQ

**Is this a Supabase product?** No. It is an independent project.

**Does it find bugs automatically?** It checks defined expectations and records observations. A failed check needs contract review, reproduction and environmental investigation before it is a confirmed defect.

**Does it need an AI API key?** No. Optional AI diagnosis is deferred until there is evidence it adds value.

**Is it self-improving?** No demonstrated adaptive improvement is claimed. The planner is a deterministic retest heuristic. A future strategy must beat a fixed baseline under equal budgets on held-out failures.

**Can I use it against production or a cloud bucket?** This release is scoped to authorized disposable local environments. Loopback must not be used to tunnel production into the test scope.

**Does a green report mean S3 compliant?** No. It means the executed checks passed in that run. Unsupported or skipped cases remain visible.

**Are timing values benchmarks?** No. They are request diagnostics from the local run.

**Is the npm name owned by this project?** Do not assume so. Check the release instructions and package ownership. npm publication needs separate authorization.

## Career summary grounded in evidence

**GitHub description:** Local-first object-storage diagnostics with cross-protocol byte checks, bounded test execution and reviewable evidence reports.

**CV project entry:** Built an independent Node.js diagnostic CLI for local Supabase Storage, exercising REST/S3/TUS interoperability and binary integrity. Designed deterministic scenarios, report/export workflows and controlled-failure tests. Investigated a false-positive protocol assumption and documented the correction. State the current verified test results and links when applying; do not imply production adoption or maintainer approval.

The tool and Storage Engineering Lab have different roles: this project demonstrates developer-product design and test-harness engineering; the research lab records a separate upstream investigation. Do not attribute that lab's contribution to this repository.

## Interview prompts and tradeoffs

- Why compare bytes instead of relying on ETags? ETags are not a universal content-hash contract across implementations and upload modes.
- Why is HTTP 400 sometimes expected for a missing Supabase REST object? Protocol-specific error mapping needs inspection of the storage error status, not identical S3/REST envelopes.
- What is the difference between TUS continuation and recovery from an interrupted transfer? HEAD/PATCH offset checks do not simulate a broken in-flight request or server restart.
- Why distinguish ERROR from INCONCLUSIVE? A harness programming failure should not look like an uncertain target observation.
- What can a checksum manifest prove? It detects file changes relative to the manifest; it does not authenticate the author or certify a result.
- Why keep AI optional and adaptation deferred? The core diagnostic claim must be checkable without trusting model interpretation; added strategy complexity needs measured benefit.
- Why avoid remote targets initially? Credential routing, resource ownership and destructive cleanup require a separate authorization design beyond a local disposable workflow.

## v0.3.0 channel drafts — do not publish

Release notes: Storage Doctor 0.3.0 adds a conservative offline report comparison and an installed fixture demo. A healthy baseline can detect PASS→FAIL after a target change; incomplete, mismatched or fixture/live evidence fails closed. The Action adds an optional baseline and a concise job summary. Use the final gates in release.md; do not reuse historical test counts as candidate evidence.

Technical article outline: “When a storage regression gate should refuse to decide.” Show a real recorded healthy local run, an explicitly injected fixture corruption, then a mismatched selection/authorization example returning exit 2. Explain source fingerprints, seed/selection matching, cleanup uncertainty, and why this is neither performance comparison nor automatic bug attribution. Link original reports and exact artifact checksum.

Supabase community draft: “I am testing a small local REST/S3/TUS diagnostic CLI. The new workflow compares two evidence reports while keeping unavailable evidence distinct from a failed assertion. Would this help with an actual self-hosted upgrade? The demo is a fixture; real local Supabase evidence and limitations are documented. I am looking for two observed setup sessions, not compatibility endorsements.”

Hacker News draft title: “Show HN: Storage Doctor — local storage diagnostics with reviewable regression evidence”. Body: describe the PASS→FAIL use case, link the repository and reviewed release, disclose local-only scope, fixtures, lack of external validation and existing S3 test alternatives. Use Show HN only once people can actually try the approved artifact.

Reddit draft: “Debugging local Supabase Storage across REST, S3 and resumable uploads: a small CLI experiment.” Show one reproducible command sequence and ask whether evidence made a real debugging task easier. Check the chosen community's rules before any owner-approved post; do not cross-post identical promotions or ask for votes.

LinkedIn draft: “A storage diagnostic can fail because the target disagrees, because evidence is incomplete, or because the test's expectation was wrong. I built a small local CLI to keep these distinct. The latest candidate adds status regression comparison and a packaged fixture demo, with fault tests and real local Supabase runs. It remains an engineering project without production adoption claims.”

60-second candidate demo: (0–10s) show help and local-only scope; (10–25s) run `storage-doctor demo --out GOOD`, state fixture; (25–40s) run `storage-doctor demo --inject-corruption --out BAD`, show exit 1; (40–50s) compare GOOD/report.json with BAD/report.json; (50–60s) show the actual reason/cleanup and explain that a vendor finding needs real-engine reproduction. Record once with real terminal output, not scripted fictional results.

Portfolio addition: v0.3.0 demonstrates product restraint and evidence handling: reuse the existing protocol engine, compare only equivalent declared diagnostic inputs, separate contract disagreement from missing evidence, and test from a packed consumer. Its strongest evidence is bounded protocol work, negative/security tests, reproducibility and an explicit oracle correction. It still does not demonstrate large-scale production operations, multi-tenant RLS security, crash recovery, broad provider support or measured user adoption. Ownership and popularity are not substitutes for those experiences.

## Actual 45-second capture

The [terminal capture](../examples/showcase/regression.cast), [plain transcript](../examples/showcase/transcript.txt) and [metadata](../examples/showcase/recording.json) contain actual script-invoked commands and captured stdout/stderr at original wall-clock times. Commands exit 0 (healthy fixture), 1 (injected corruption), 1 (comparison), 0 (export) and 0 (verification). Narration is scripted and labelled; it is not a human usability session, screen video or real Supabase defect. Re-record from the source checkout with `npm run demo:record`; each run uses new output directories and checks the actual exit values. Review local path identifiers before external sharing.

Recommended metadata (not applied): keep the current factual repository description; proposed topics: supabase, s3, storage, tus, cli, diagnostics, testing. Good first contributions should be based on actual onboarding findings; a useful bounded candidate is documenting a verified Windows/PowerShell setup after someone executes it. Do not create speculative public issues or claim Windows validation now.
