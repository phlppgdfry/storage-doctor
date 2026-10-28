# Roadmap, adoption and stop criteria

## Implemented scope

- Ten fixed local scenarios, built-in pack selectors, S3-only and Supabase profiles.
- JSON, Markdown and offline HTML evidence with checksums.
- Named replay, focused evidence export and deterministic next-test suggestion.
- A protocol fixture with controlled corruption, real Supabase integration helper, pinned CI definitions and a composite Action.
- Strict schema 2 imports, schema 1 history conversion, complete bundle verification and a configuration doctor.

## Explicitly deferred

- AI root-cause explanations, automatic patching and LLM API integrations.
- Self-modifying tests or claims of self-improvement.
- Stateful generation, property-based shrinking, differential comparisons with another engine.
- Network fault injection, service restarts and concurrency campaigns.
- Hosted playground, knowledge graph, report uploads or telemetry.
- Cloud targets and a comprehensive S3 compliance score.

These would materially increase the trust and maintenance burden. A passing small suite does not justify them on its own.

## Next experiments

1. Have an external developer run one local cross-protocol workflow and identify whether evidence export helps. Publication/contact requires authorization.
2. Select one documented failure mode and add a deterministic fault case that detects it. Compare against upstream tests before expanding the harness.
3. Evaluate a candidate scenario selector against fixed ordering under equal request/time budgets on seeded injected faults. Use a held-out mutation set and multiple seeds; report false positives and uncertainty. Preserve improvements only if repeated held-out evaluation beats baseline without compromising runtime or reproducibility.

The current `plan` command is a baseline heuristic. Its output is not empirical proof of learning. Research memory initially consists of versioned reports and explicit decisions. JSONL/SQLite, autonomous model calls and multiple agents are unnecessary until measured workflow needs justify them.

## Publication readiness

Before npm/GitHub release: confirm repository and package ownership; set official links; verify the packaged binary in a clean temporary consumer; run relevant CI on the intended platforms; review license, report contents and documentation. The npm name is a proposed local package name, not a claimed namespace. Publishing is an explicit user decision.

Lead the README/demo with a real workflow and a small report. Show a controlled corrupt-bytes demo with the injection label visible. Publish a truthful case study about the contract mistake as well as the successful tests. Never imply a fixture failure is a newly discovered vendor defect.

Potential distribution assets: a short terminal recording, an offline HTML report and an example CI artifact. No manufactured stars, test counts, testimonials, “100 bugs” challenge or promises of virality.

## What a hiring engineer can assess

- Can another engineer run it without a private setup conversation?
- Are assertions tied to actual protocol guarantees?
- Does it detect controlled faults and classify uncertainty honestly?
- Are unexpected results investigated instead of promoted?
- Is scope small enough to maintain and review?
- Do later contributions show response to real review feedback?

Adoption and upstream merges must be linked only after they happen. This project supplies inspectable evidence, not a substitute for professional experience or a promise of employment.

## Stop or pivot

- If the upstream acceptance runner already solves the same workflow as well, contribute usability improvements there.
- If independent users cannot get a useful result, prioritize setup friction before new features.
- If suspected failures are mostly contract errors, improve the oracle before generating more cases.
- If new infrastructure is not needed to answer a concrete question, do not build it.
- If an isolated run exceeds 80 exploration requests or its 120-second exploration deadline, stop exploration and clean up owned resources.
- If an experiment needs production endpoints, destructive shared-resource changes or vulnerability publication, it is outside the authorized local workflow.

## Optional AI design boundary

If user feedback justifies it, an explicitly invoked analysis command may consume the same validated evidence schema and return labelled hypotheses with links to observations. It must need a separate provider configuration, an explicit per-call token/cost limit and consent before sending any report to that provider. No credentials or raw bodies belong in the payload. It must never execute suggested commands, alter config, create issues or apply patches. The deterministic CLI and evidence export remain sufficient without it. No provider implementation or model call is currently shipped.
