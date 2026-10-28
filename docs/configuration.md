# Configuration and permissions

Run from a clone with `node src/cli.js`; after installing a packed artifact, use `storage-doctor`. No npm release exists yet. All credentials come from environment variables; never put them in command flags.

| Variable                                   | Meaning                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `SD_PROFILE`                               | `supabase` (REST/S3/TUS) or `s3` (S3 checks only)                                        |
| `SD_REST_URL`                              | REST root, default `http://127.0.0.1:54321/storage/v1`                                   |
| `SD_S3_URL`                                | S3 endpoint; defaults to REST root plus `/s3`                                            |
| `SD_TUS_URL`                               | TUS creation endpoint; defaults to REST root plus `/upload/resumable`                    |
| `SD_BUCKET`                                | Existing dedicated `sd-*` or `storage-doctor-*` bucket                                   |
| `SD_REGION`                                | Signing region; `local` for the supplied CLI stack                                       |
| `SD_ACCESS_KEY_ID`, `SD_SECRET_ACCESS_KEY` | Explicit S3 credentials, required                                                        |
| `SD_SESSION_TOKEN`                         | Optional S3 session token                                                                |
| `SD_TOKEN`, `SD_API_KEY`                   | REST/TUS bearer token and optional gateway API key; bearer required for Supabase profile |
| `SD_SEED`                                  | Reproducible payload seed, 1–64 alphanumeric/dash/underscore characters                  |
| `SD_TARGET_VERSION`                        | Target image tag/digest or commit; defaults to `unrecorded`                              |
| `SD_TIMEOUT_MS`                            | Whole-request limit, 100–30000 ms; default 5000                                          |

Copy `examples/local.env.example` to an ignored `.env`, fill values from your **own disposable local environment**, then run:

```sh
node --env-file=.env src/cli.js doctor --json
node --env-file=.env src/cli.js check --local --pack core
```

`doctor` only validates configuration. It does not contact the server, authenticate, create a bucket or prove your token has access. The `check` command requires a pre-existing test bucket and permissions to put, read, head and delete its own objects; Supabase checks additionally need REST upsert/read and TUS create/patch/head/termination. No bucket deletion permission is needed by `check`.

`npm run integration` is a separate helper for this repository's stack: it reads local CLI status privately, creates a unique private test bucket, executes the campaign and deletes only that explicitly created bucket. It uses a privileged local service token, so it does not test end-user RLS. The helper never empties a bucket if deletion fails.

Endpoint validation rejects DNS names, URL credentials/fragments, unsupported schemes and noncanonical loopback aliases. HTTP redirects are not followed. Direct sockets bypass global fetch/proxy configuration and validate the actual connected address. TLS certificate validation remains enabled. A loopback tunnel to production is still production: do not configure one.

## Troubleshooting

- **Missing configuration:** run `doctor`, then check required variable names; values are deliberately suppressed from errors.
- **HTTP 401/403:** credentials or authorization could not be evaluated; result is INCONCLUSIVE, not UNSUPPORTED.
- **HTTP 400/404:** inspect target configuration and the linked protocol contract. A failed check is not automatically a target bug.
- **Timeout/network error:** confirm your local stack is ready. Body stalls are included in the deadline.
- **Existing output directory:** choose a new `--out`; reports never overwrite evidence or follow an existing output link.
- **Cleanup warning:** inspect the exact run-owned prefix in the warning. Do not empty the bucket. Resolve access/reachability and remove only those disposable objects manually.
- **Schema error:** imports are capped at 2 MiB, reject unknown fields and recognizable credential material. Keep the source file privately; do not weaken validation to export it.
