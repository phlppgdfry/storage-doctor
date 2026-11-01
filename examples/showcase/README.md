# Authentic showcase evidence

The README combines **two different, explicitly identified executions**: a historical real local Supabase run and a new intentionally corrupted protocol fixture. Neither proves universal compatibility or a vendor defect. No report data or screenshot pixels were edited.

## What the images show

| Image                                                            | Source and accessible alternative                                                                                                                                                                                           | Capture                                                                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [Local Supabase report](images/local-supabase-report.png)        | [Original real-run report](../v0.3.0-rc2/report.md), [JSON](../v0.3.0-rc2/report.json), [HTML](../v0.3.0-rc2/report.html) and [manifest](../v0.3.0-rc2/checksums.json). Recorded 2026-10-29; ten checks passed.             | Chrome 156.0.8078.74; 1120 × 870 viewport; top of original HTML.                                           |
| [Injected failure detail](images/injected-regression-detail.png) | [Fixture candidate report](fixture-candidate/report.md), [JSON](fixture-candidate/report.json) and [HTML](fixture-candidate/report.html). REST upload / S3 read returned HTTP 200 but failed byte equality; cleanup passed. | Same browser; `rest-to-s3` details opened by clicking its summary; screenshot of that element, 1000 × 440. |

The detail image is **intentional fixture corruption, not a real Supabase failure**. The report's generic `check --local` replay instruction requires a separately provisioned target; use `demo --inject-corruption` below to reproduce this fixture. Millisecond values are recorded diagnostics, not benchmarks.

[Capture metadata and SHA-256 digests](capture.json) identify the original source reports and PNGs. PNGs contain no address bar, workstation path or credentials. Only the details-open state and viewport were changed in the browser; no styling, masking, retouching or synthetic terminal rendering was used.

## Baseline → injected failure → verified evidence

| Retained result                                                                | Actual outcome                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [Fixture baseline](fixture-baseline/report.md)                                 | Ten passes, exit 0, no cleanup warnings                                   |
| [Fixture candidate](fixture-candidate/report.md)                               | Nine failures, one pass, exit 1, no cleanup warnings                      |
| [Comparison text](comparison.txt) / [machine-readable result](comparison.json) | Comparable fixture runs; nine PASS→FAIL transitions; `regression`, exit 1 |

Verify these committed bundles from the repository root:

```sh
node src/cli.js verify --report examples/v0.3.0-rc2 --json
node src/cli.js verify --report examples/showcase/fixture-baseline --json
node src/cli.js verify --report examples/showcase/fixture-candidate --json
node src/cli.js compare --baseline examples/showcase/fixture-baseline/report.json --report examples/showcase/fixture-candidate/report.json --json
```

The last command intentionally exits 1. Checksums establish integrity relative to a manifest, not authenticity.

To create your own fresh evidence, run these commands **separately** from the v0.3.0 source checkout with Node 22/24 and `npm ci`. Choose new output paths if they already exist. The second and third commands intentionally exit 1; do not chain them with `&&` or shell-wide `set -e`:

```sh
node src/cli.js demo --out reports/my-baseline
node src/cli.js demo --inject-corruption --out reports/my-candidate
node src/cli.js compare --baseline reports/my-baseline/report.json --report reports/my-candidate/report.json
node src/cli.js export rest-to-s3 --report reports/my-candidate/report.json --out reports/my-reproduction
node src/cli.js verify --report reports/my-reproduction --json
```

The new committed runs use the unchanged v0.3.0 diagnostic engine. Seeds and bytes repeat; ephemeral ports, random run IDs and timings need not. Credentials are synthetic and the server binds loopback.

## Recreate the browser captures

Browser tooling is optional and is not a project dependency. With an existing `playwright-cli` installation, serve only the examples directory locally:

```sh
python3 -m http.server 18769 --bind 127.0.0.1 --directory examples
```

In another terminal, from the repository root:

```sh
playwright-cli -s=storage-showcase open --browser=chrome
playwright-cli -s=storage-showcase goto http://127.0.0.1:18769/v0.3.0-rc2/report.html
playwright-cli -s=storage-showcase resize 1120 870
playwright-cli -s=storage-showcase screenshot --filename=reports/local-supabase-report.png
playwright-cli -s=storage-showcase goto http://127.0.0.1:18769/showcase/fixture-candidate/report.html
playwright-cli -s=storage-showcase resize 1120 900
playwright-cli -s=storage-showcase run-code 'async page => { const detail = page.locator("details").filter({has: page.locator("small", {hasText: "rest-to-s3 ·"})}); await detail.locator("summary").click(); await detail.screenshot({path: "reports/injected-regression-detail.png", scale: "css"}); }'
playwright-cli -s=storage-showcase close
```

Stop the local server with Ctrl-C. A different browser/font environment can produce different screenshot pixels; report checksums remain the reference for evidence integrity. On this Mac the existing CLI was provided by `mise exec node@24.21.0 -- playwright-cli`; no browser tool was added to project dependencies.

## Existing 45-second recording and hosted evidence

The earlier [terminal recording](regression.cast), [text transcript](transcript.txt) and [recording metadata](recording.json) are preserved unchanged. They capture actual command output with scripted invocation/narration; they are not a video or newly recorded footage. The historical transcript includes its original workstation output paths. Run `npm run demo:record` for a fresh capture.

[Hosted Node 22/24 release validation](https://github.com/phlppgdfry/storage-doctor/actions/runs/41145223787) · [Real Supabase + Action execution](https://github.com/phlppgdfry/storage-doctor/actions/runs/41168269115) · [Four-case Action consumer](https://github.com/phlppgdfry/storage-doctor/actions/runs/41145223764) · [Permanent release assets](https://github.com/phlppgdfry/storage-doctor/releases/tag/v0.3.0).

Independent human usability and security review remain unperformed. [Reviewer tasks](../../docs/review.md) · [Return to quickstart](../../README.md#try-it-safely).
