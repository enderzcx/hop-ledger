# AgentRail Spec v0.2

## 1. Scope
AgentRail defines a deterministic envelope contract for auditable task execution.

This version formalizes:
- transport abstraction (`send envelope -> receive result`)
- x402 binding hooks
- verifier CLI contracts
- fixture-based conformance checks

## 2. Required IDs
- `traceId`
- `requestId`
- `taskId`
- `conversationId`
- `messageId`
- `hopIndex`

All lifecycle messages MUST preserve ID continuity inside one run.

## 3. Lifecycle
1. `task-envelope`
2. `task-ack` (optional)
3. `task-phase` (optional)
4. `task-result`

## 4. Envelope Requirements
- `protocolVersion` MUST be `agentrail-v1` or `agentrail-v1.x`
- `kind` MUST be one lifecycle kind
- `createdAt` MUST be ISO timestamp
- `payload` MUST be deterministic JSON-serializable data

If `kind = task-result` and settlement is required:
- `payment.requestId` MUST equal envelope `requestId`
- `receiptRef.requestId` SHOULD equal envelope `requestId`
- `payment.txHash` and `receiptRef.txHash` SHOULD match the settlement tx

## 5. Transport Contract
Transport is implementation-agnostic.

Required behavior:
- input: `SendEnvelopeRequest { endpoint, envelope, headers?, timeoutMs? }`
- output: `EnvelopeDelivery { endpoint, status, resultEnvelope, rawBody? }`
- a successful delivery MUST include a valid `resultEnvelope`

Reference APIs:
- `createHttpEnvelopeTransport(...)`
- `createMockEnvelopeTransport(...)`
- `sendEnvelopeWithHooks(...)`

## 6. x402 Binding Hooks
Hooks allow settlement binding without modifying adapter mapping logic.

Hook phases:
- `beforeSend(request)` optional request mutation
- `afterReceive({ request, delivery })` optional patch:
  - `payment`
  - `receiptRef`

Patch result MUST be merged into `delivery.resultEnvelope`.

## 7. Canonical Digest
- canonicalization: stable key sort, array order preserved
- digest algorithm: `sha256`
- envelope digest API: `digestEnvelope(envelope)`

Run digest:
- scope marker: `agentrail-run-v1`
- computed over ordered step digests + ID continuity material
- reference API: `digestRunFixture(run)`

## 8. Verifier CLI Contract
Commands:
- `verify-envelope --file <path> [--expected-digest <hex>]`
- `verify-run --file <path>`

Exit codes:
- `0`: verification passed
- `1`: verification failed
- `2`: invalid command or arguments

## 9. Fixture Contract
Required fixtures:
- single envelope fixture (`name`, `envelope`, `expectedDigest`)
- run fixture (`steps[]`, optional `expectedRunDigest`)

Reference path:
- `fixtures/contracts/*.fixture.json`

## 10. Version Strategy
- Major protocol line: `agentrail-v1`
- Additive, backward-compatible fields:
  - MAY publish as `agentrail-v1.x`
  - MUST keep prior required fields stable
- Breaking change:
  - MUST bump major line (`agentrail-v2`)
  - MUST ship migration notes and updated fixtures
- Adapter SDK versions (package semver) are independent from protocol major line.

## 11. OpenClaw Adapter Contract
- `toTaskEnvelope(input, ctx)` maps inbound OpenClaw task to AgentRail envelope.
- `toTaskResult(result, ctx, options)` maps execution output to AgentRail result envelope.
- `verifyEnvelopeDigest(envelope, expectedDigest)` validates deterministic hash.
- Reference implementation: `src/adapters/openclaw.ts`.
