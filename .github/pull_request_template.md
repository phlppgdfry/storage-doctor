## Problem and resulting behavior

Describe the concrete trigger, previous behavior and new behavior. Keep one related change per PR.

## Evidence

- Commands actually executed:
- Results and limitations:
- Target version, if protocol behavior changed:
- Documented protocol contract, if assertions changed:

## Review

- [ ] Tests detect the relevant incorrect behavior.
- [ ] Cleanup is limited to exact run-owned resources, including partial failures.
- [ ] Requests, streams and generated evidence remain bounded.
- [ ] No credentials, raw response bodies or private logs are included.
- [ ] Status/exit-code/schema changes are documented.
- [ ] Claims distinguish fixture checks, real-engine observations and unverified hypotheses.

Use SECURITY.md instead of a public PR for sensitive vulnerability details.
