# Storage Doctor

Mode: **live** · Target: `public.ecr.aws/supabase/storage-api:v1.84.19` · 2026-10-28T19:10:07.617Z

These observations describe this run, not universal compatibility or a confirmed upstream defect.

| Scenario | Status | Evidence |
|---|---|---|
| s3-roundtrip | passed | All scenario assertions passed. |
| s3-empty | passed | All scenario assertions passed. |
| s3-path | passed | All scenario assertions passed. |
| s3-range | passed | All scenario assertions passed. |
| s3-metadata | passed | All scenario assertions passed. |
| rest-to-s3 | passed | All scenario assertions passed. |
| s3-to-rest | passed | All scenario assertions passed. |
| rest-overwrite-s3 | passed | All scenario assertions passed. |
| s3-delete-rest | passed | All scenario assertions passed. |
| tus-resume-cross | passed | All scenario assertions passed. |

Cleanup warnings: 0. Exit code: 0.

Request durations are diagnostics, not controlled performance benchmarks.
