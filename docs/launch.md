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
