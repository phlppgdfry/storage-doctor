---
name: Propose a diagnostic scenario
about: Suggest a focused source-backed check
title: ""
labels: ""
assignees: ""
---

## Developer problem

What concrete debugging or regression workflow would this improve?

## Contract

Which protocol/provider supports the behavior? Link its documented guarantee. Describe intentional differences and prerequisites.

## Smallest experiment

List operations, expected observations and how a controlled incorrect implementation would be detected. Explain why existing scenarios or upstream tests do not already address the workflow adequately.

## Safety and evidence

Describe local-only setup, request/data/runtime limits, run-owned resources, cleanup after partial failure and the evidence required for reproduction. Do not propose production testing or include credentials.
