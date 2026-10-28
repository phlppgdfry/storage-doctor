---
name: Diagnostic or CLI bug
about: Report unexpected tool behavior with a safe local reproduction
title: ""
labels: ""
assignees: ""
---

Please use SECURITY.md for suspected vulnerabilities. Do not include credentials, authorization headers, .env files or raw server logs.

## Expected and observed behavior

What should have happened? What actually happened? A failed diagnostic is an observation, not automatically a vendor defect.

## Reproduction

- Storage Doctor version/commit:
- Node/npm version and platform:
- Local target version/image:
- Profile, pack and scenario ID:
- Sanitized command:
- Exit code and diagnostic status:
- Cleanup outcome:

Provide the smallest authorized disposable local reproduction. State whether the result repeated in a fresh namespace. If sharing an evidence bundle, verify its integrity and inspect every file for secrets first.

## Contract and environment checks

Link the documented expected behavior if known. Note whether the result came from a real engine or the protocol fixture and whether the same behavior appears with another client.
