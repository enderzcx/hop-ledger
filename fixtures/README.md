# Contract Fixtures

This directory stores deterministic contract fixtures for protocol conformance checks.

- `contracts/task-envelope.fixture.json`
- `contracts/task-result.fixture.json`
- `contracts/run.fixture.json`

Use verifier CLI:

```bash
npm run build
node dist/src/cli/verifier.js verify-envelope --file fixtures/contracts/task-envelope.fixture.json
node dist/src/cli/verifier.js verify-envelope --file fixtures/contracts/task-result.fixture.json
node dist/src/cli/verifier.js verify-run --file fixtures/contracts/run.fixture.json
```
