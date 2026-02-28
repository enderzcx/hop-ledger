# HopLedger

HopLedger is the AgentRail protocol layer for auditable agent-to-agent and agent-to-API execution.

## Version
- Package: `v0.2.0`
- Protocol baseline: `agentrail-v1`

## Positioning
- Brand: HopLedger
- Protocol layer: AgentRail
- Goal: verifiable execution with trace-linked payment and result evidence

## Directory
- `specs/` protocol and API contracts
- `adapters/openclaw/` OpenClaw integration notes
- `examples/` minimal runnable examples
- `fixtures/` deterministic envelope/run fixtures
- `docs/` conformance and pilot runbooks
- `src/` typed SDK primitives for adapters and verification

## v0.2 Surface
- Transport abstraction:
  - `createHttpEnvelopeTransport(...)`
  - `createMockEnvelopeTransport(...)`
  - `sendEnvelopeWithHooks(...)`
- x402 binding hooks:
  - `X402BindingHook.beforeSend(...)`
  - `X402BindingHook.afterReceive(...)`
- Verifier CLI:
  - `verify-envelope`
  - `verify-run`
- Verifier API mode:
  - `POST /verify/envelope`
  - `POST /verify/run`
- Contract fixtures:
  - `fixtures/contracts/task-envelope.fixture.json`
  - `fixtures/contracts/task-result.fixture.json`
  - `fixtures/contracts/run.fixture.json`

## OpenClaw Integration (MVP)
- Envelope contract: `src/core/types.ts`
- Adapter contract: `src/adapters/openclaw.ts`
- Deterministic digest helper: `src/verify/digest.ts`
- Demo mapping flow: `examples/openclaw-adapter.example.ts`
- Transport + x402 hook flow: `examples/transport-x402-hooks.example.ts`

## Quick Start
```bash
npm install
npm run typecheck
npm run build
```

Verifier quick check:

```bash
node dist/src/cli/verifier.js verify-envelope --file fixtures/contracts/task-envelope.fixture.json
node dist/src/cli/verifier.js verify-run --file fixtures/contracts/run.fixture.json
```

Conformance gate:

```bash
npm run conformance
```

Digest parity check:

```bash
npm run parity:kite
```

Runbooks:
- `docs/conformance-acceptance.md`
- `docs/digest-parity-kite-reference.md`
- `docs/verifier-api-deploy.md`
- `docs/openclaw-pilot-runbook.md`
- `docs/verifier-api.md`
- `docs/openclaw-handoff-quickstart.md`
- `docs/openclaw-blind-handoff-scorecard.md`
- `docs/rollback-sop.md`
- `docs/migration-agentrail-v1-to-v1x.md`
- `docs/pilot-stability-benchmark-2026-03-01.md`
- `docs/verifier-api-container-check-2026-03-01.md`

Pilot runner (writes artifacts + verifies run):

```bash
npm run pilot:openclaw
```

Skill mode quick run:

```bash
HOP_PILOT_MODE=skill
HOP_PILOT_PAYER=<aa_wallet_address>
HOP_PILOT_SESSION_ID=<optional_session_id>
npm run pilot:openclaw
```

By default, skill mode auto-handles `402 payment_required` with `session pay -> proof submit`.

Start verifier API service (local):

```bash
npm run verify:api
```

Default endpoint: `http://127.0.0.1:4411`

Quick checks:

```bash
curl -sS http://127.0.0.1:4411/health
curl -sS -X POST http://127.0.0.1:4411/verify/run \
  -H "content-type: application/json" \
  --data-binary @fixtures/contracts/run.fixture.json
```

API smoke check:

```bash
npm run smoke:verify-api
```

Then implement your OpenClaw runtime against:
- `createOpenClawAdapter().toTaskEnvelope(...)`
- `createOpenClawAdapter().toTaskResult(...)`
- `digestEnvelope(...)` for deterministic evidence hashing

## Copy-Paste Transport + Hooks

```ts
import {
  createHttpEnvelopeTransport,
  createOpenClawAdapter,
  sendEnvelopeWithHooks,
  type X402BindingHook
} from "hop-ledger";

const adapter = createOpenClawAdapter();
const transport = createHttpEnvelopeTransport();

const hooks: X402BindingHook[] = [
  {
    afterReceive: ({ request }) => ({
      payment: {
        mode: "x402",
        requestId: request.envelope.requestId,
        txHash: "0x...",
        block: 123,
        status: "success"
      },
      receiptRef: {
        requestId: request.envelope.requestId,
        txHash: "0x...",
        block: 123,
        status: "success",
        endpoint: `/api/receipt/${request.envelope.requestId}`
      }
    })
  }
];

const delivery = await sendEnvelopeWithHooks(transport, {
  endpoint: "https://your-agent-endpoint.example/agentrail",
  envelope: adapter.toTaskEnvelope(taskInput, taskContext),
  hooks
});
```
