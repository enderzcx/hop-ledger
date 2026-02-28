# OpenClaw Adapter

This adapter maps OpenClaw task execution into HopLedger AgentRail envelopes.

## Contract
- Types: `src/core/types.ts`
- Adapter implementation helper: `src/adapters/openclaw.ts`

## Mapping Rules (MVP)
1. OpenClaw inbound task -> `kind: task-envelope`
2. OpenClaw execution result -> `kind: task-result`
3. Preserve IDs: `traceId/requestId/taskId/conversationId/messageId/hopIndex`
4. If settled, include `payment` and `receiptRef`

## Verification
- Use `digestEnvelope(...)` from `src/verify/digest.ts`
- Persist digest with each hop/result for later audit replay
