# AgentRail Spec v0.1

## Required IDs
- `traceId`
- `requestId`
- `taskId`
- `conversationId`
- `messageId`
- `hopIndex`

## Lifecycle
1. `task-envelope`
2. `task-ack` (optional)
3. `task-phase` (optional)
4. `task-result`

## Envelope Requirements
- `protocolVersion` MUST be `agentrail-v1`
- `kind` MUST be one of lifecycle kinds
- `createdAt` MUST be ISO timestamp
- `payload` MUST be deterministic JSON-serializable data

## Audit Binding
- If settlement is required, `task-result` SHOULD include:
  - `payment.requestId`
  - `payment.txHash`
  - `receiptRef.requestId`
- Export package SHOULD include:
  - `schemaVersion`
  - deterministic digest over canonical payload

## Canonical Digest
- Canonicalization: stable key sort + array order preserved.
- Digest algorithm: `sha256`.
- Reference implementation: `src/verify/digest.ts`.

## OpenClaw Adapter Contract
- `toTaskEnvelope(input, ctx)` maps inbound OpenClaw task to AgentRail envelope.
- `toTaskResult(result, ctx, options)` maps execution output to AgentRail result envelope.
- `verifyEnvelopeDigest(envelope, expectedDigest)` validates deterministic hash.
- Reference implementation: `src/adapters/openclaw.ts`.
