# Changelog

## 0.3.0 — Local release candidate, 2026-10-29

- RC audit: comparison now verifies complete bundles automatically, requires declared live authentication context and rejects conflicting metadata/timestamps. Status-transition, selection, schema and tamper regression tests added.
- Offline `compare` command detects PASS→FAIL while refusing mismatched builds, selections, fixture/live provenance and incomplete evidence. Strict healthy-baseline and cleanup requirements; unchanged report schema 2.
- Installed `demo` command uses the same runner and explicit fixture provenance without credentials or checkout-only test files. Controlled corruption demonstrates the failure and comparison exit codes.
- Optional Action baseline and concise status job summary, plus separate-consumer shell validation. Hosted validation of this candidate remains pending.
- Fresh-cache package installation validation and corrected cache/offline documentation. Existing user modification to prefer-offline is preserved.
- New regressions cover corruption, unavailable evidence, mismatched inputs, forged summaries and CLI JSON/exit behavior. Historical v0.2.0 evidence and draft are unchanged.

No new storage assertions, runtime dependencies, AI, general shrinking, provider coverage or performance claims.

## 0.2.0 — 2026-10-28

Hardening and developer-experience upgrade, validated locally and by Node 22/24 fast CI plus real Linux Supabase/Action integration. Remote release status is recorded in [release readiness](docs/release.md).

- Direct local HTTP/S transport, proxy isolation, connected-address checks and raw response limits before SDK parsing.
- Enforced run-owned mutations, cancellation and separately bounded per-scenario cleanup.
- Schema 2 results with contracts, observations, reproduction, cleanup and environment/source fingerprints. Historical schema 1 imports are validated and normalized.
- Strict bounded report imports, safe exclusive output, complete evidence checksums and a verify command.
- Configuration doctor, strict command options, JSON/quiet output and built-in pack selectors.
- TUS offset-conflict rejection added to the existing resumable cross-protocol scenario.
- Improved offline HTML, documentation, security regressions and clean-consumer checks.
- SHA-pinned Node 22/24 CI, separate service integration, and a composite GitHub Action for already provisioned local targets.

No npm publication, universal S3 compliance, new vendor defect, AI diagnosis or measured self-improvement is claimed.

## 0.1.0 — Local baseline, 2026-10-28

- Ten local S3, REST and TUS diagnostic scenarios with seeded binary payloads.
- S3-only and Supabase profiles, named scenario execution and CI exit codes.
- JSON, Markdown and offline HTML reports; evidence export and a deterministic retest planner.
- Protocol fixture with controlled corrupt-byte behavior and a separate real-engine integration helper.
- Historical local verification against Supabase Storage v1.84.19; see the retained [validation record](docs/validation.md).
- Initial architecture, security and contributor documentation.

The first compound Unicode/percent filename expectation was corrected after checking Supabase's documented restrictions. It is not a confirmed upstream bug.
