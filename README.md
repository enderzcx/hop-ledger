# HopLedger

HopLedger is the AgentRail protocol layer for auditable agent-to-agent and agent-to-API execution.

## Positioning
- Brand: HopLedger
- Protocol layer: AgentRail
- Goal: verifiable execution with trace-linked payment and result evidence

## Directory
- `specs/` protocol and API contracts
- `adapters/openclaw/` OpenClaw integration notes
- `examples/` minimal runnable examples
- `src/` typed SDK primitives for adapters and verification

## OpenClaw Integration (MVP)
- Envelope contract: `src/core/types.ts`
- Adapter contract: `src/adapters/openclaw.ts`
- Deterministic digest helper: `src/verify/digest.ts`
- Demo mapping flow: `examples/openclaw-adapter.example.ts`

## Quick Start
```bash
npm install
npm run typecheck
npm run build
```

Then implement your OpenClaw runtime against:
- `createOpenClawAdapter().toTaskEnvelope(...)`
- `createOpenClawAdapter().toTaskResult(...)`
- `digestEnvelope(...)` for deterministic evidence hashing
