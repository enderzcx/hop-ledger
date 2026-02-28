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

## Fast Integration (Copy-Paste)

```ts
import {
  createOpenClawAdapter,
  createHttpEnvelopeTransport,
  sendEnvelopeWithHooks,
  type AgentRailContext,
  type OpenClawTaskInput,
  type OpenClawTaskResult,
  type X402BindingHook
} from "hop-ledger";

const adapter = createOpenClawAdapter();
const transport = createHttpEnvelopeTransport();

const ctx: AgentRailContext = {
  traceId: "trace_001",
  requestId: "x402_001",
  taskId: "task_001",
  fromAgentId: "router-agent",
  toAgentId: "openclaw-agent",
  channel: "api",
  hopIndex: 1,
  conversationId: "conversation_001",
  messageId: "message_001",
  createdAt: new Date().toISOString()
};

const task: OpenClawTaskInput = {
  capability: "risk-score",
  input: { symbol: "BTCUSD" }
};

const hooks: X402BindingHook[] = [
  {
    afterReceive: ({ request }) => ({
      payment: {
        mode: "x402",
        requestId: request.envelope.requestId,
        txHash: "0x123",
        block: 42,
        status: "success"
      },
      receiptRef: {
        requestId: request.envelope.requestId,
        txHash: "0x123",
        block: 42,
        status: "success",
        endpoint: `/api/receipt/${request.envelope.requestId}`
      }
    })
  }
];

const outboundEnvelope = adapter.toTaskEnvelope(task, ctx);
const delivery = await sendEnvelopeWithHooks(transport, {
  endpoint: "https://provider-agent.local/agentrail",
  envelope: outboundEnvelope,
  hooks
});

const result: OpenClawTaskResult = delivery.resultEnvelope.payload;
console.log(result.summary);
```

## CLI Verification

```bash
npm run build
node dist/src/cli/verifier.js verify-envelope --file fixtures/contracts/task-envelope.fixture.json
node dist/src/cli/verifier.js verify-run --file fixtures/contracts/run.fixture.json
```

## External Team Handoff

- Quickstart: `docs/openclaw-handoff-quickstart.md`
- Skill-mode env template: `docs/openclaw-skill.env.example`
- Verifier API mode: `docs/verifier-api.md`
