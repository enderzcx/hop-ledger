# HopLedger Conformance Acceptance

This document defines the v0.3 preconditions for protocol conformance.

## Objective
- Ensure envelope and run artifacts are deterministic.
- Detect tampering reliably.
- Keep protocol behavior stable across adapters.

## Acceptance Matrix

| ID | Case | Input | Expected |
|---|---|---|---|
| C1 | Envelope fixture digest | `task-envelope.fixture.json` | digest match = true |
| C2 | Result fixture digest | `task-result.fixture.json` | digest match = true |
| C3 | Run fixture digest | `run.fixture.json` | run digest + all step digests match |
| C4 | Tamper detection | mutate envelope payload, keep expected digest | digest match = false |
| C5 | Wrong run expected digest | override run expected digest | run digest match = false |

## Execution

```bash
npm run conformance
```

## Gate Policy
- A release candidate MUST pass all C1-C5 checks.
- Any protocol field change MUST update fixtures and this matrix if behavior changes.
- Breaking changes MUST bump protocol major line and include migration notes.

## Related Files
- `scripts/conformance-check.mjs`
- `fixtures/contracts/task-envelope.fixture.json`
- `fixtures/contracts/task-result.fixture.json`
- `fixtures/contracts/run.fixture.json`
- `specs/AGENTRAIL_SPEC.md`
