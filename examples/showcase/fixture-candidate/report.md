# Storage Doctor

Mode: **fixture** · Target: `protocol-fixture-v1` · 2026-11-01T22:48:55.507Z

Authentication context (declared): synthetic-fixture

These observations describe this run, not universal compatibility or a confirmed upstream defect.

| Scenario | Status | Evidence |
|---|---|---|
| s3-roundtrip | failed | Downloaded bytes must exactly match uploaded bytes. |
| s3-empty | failed | Downloaded bytes must exactly match uploaded bytes. |
| s3-path | failed | Downloaded bytes must exactly match uploaded bytes. |
| s3-range | failed | Content-Range must match requested slice. |
| s3-metadata | failed | HEAD size must match bytes. |
| rest-to-s3 | failed | Downloaded bytes must exactly match uploaded bytes. |
| s3-to-rest | failed | Downloaded bytes must exactly match uploaded bytes. |
| rest-overwrite-s3 | failed | Downloaded bytes must exactly match uploaded bytes. |
| s3-delete-rest | passed | All scenario assertions passed. |
| tus-resume-cross | failed | Downloaded bytes must exactly match uploaded bytes. |

Cleanup warnings: 0. Exit code: 1.

Request durations are diagnostics, not controlled performance benchmarks.
