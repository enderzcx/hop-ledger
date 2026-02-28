# OpenClaw Pilot Runbook

This runbook defines the first real endpoint pilot for HopLedger transport + x402 binding.

## Goal
- Send a real `task-envelope` to an OpenClaw runtime endpoint.
- Receive a `task-result` envelope.
- Bind payment references through x402 hooks.
- Verify envelope and run integrity.

## Preconditions
- OpenClaw runtime endpoint is reachable over HTTPS.
- Endpoint supports `POST` and returns JSON with `resultEnvelope` or `envelope`.
- `hop-ledger` is built (`npm run build`).
- Session payment path in main backend remains session-key-first.

## Endpoint Contract

### Request
- method: `POST`
- body:

```json
{
  "envelope": {
    "protocolVersion": "agentrail-v1",
    "kind": "task-envelope",
    "traceId": "trace_xxx",
    "requestId": "request_xxx",
    "taskId": "task_xxx",
    "fromAgentId": "router-agent",
    "toAgentId": "openclaw-agent",
    "channel": "api",
    "hopIndex": 1,
    "conversationId": "conv_xxx",
    "messageId": "msg_xxx",
    "createdAt": "ISO timestamp",
    "payload": {
      "capability": "risk-score",
      "input": {}
    }
  }
}
```

### Response

```json
{
  "resultEnvelope": {
    "protocolVersion": "agentrail-v1",
    "kind": "task-result",
    "traceId": "trace_xxx",
    "requestId": "request_xxx",
    "taskId": "task_xxx",
    "fromAgentId": "openclaw-agent",
    "toAgentId": "router-agent",
    "channel": "api",
    "hopIndex": 2,
    "conversationId": "conv_xxx",
    "messageId": "msg_xxx",
    "createdAt": "ISO timestamp",
    "status": "done",
    "payload": {
      "summary": "..."
    }
  }
}
```

## Pilot Steps
1. Build package:
   - `npm run build`
2. Execute local transport + hook dry run:
   - `node dist/examples/transport-x402-hooks.example.js`
3. Switch endpoint from mock URL to pilot URL and send real request.
4. Attach x402 binding in `afterReceive` hook (`payment`, `receiptRef`).
5. Store envelope/result/run artifacts under a pilot folder.
6. Verify:
   - `node dist/src/cli/verifier.js verify-envelope --file <pilot-envelope.json>`
   - `node dist/src/cli/verifier.js verify-run --file <pilot-run.json>`

## Exit Criteria
- Real endpoint response can be mapped into valid `task-result`.
- At least one run passes digest verification end-to-end.
- `requestId` continuity is preserved between envelope/result/payment binding.

## Failure Handling
- If endpoint response shape is invalid:
  - fail fast, log raw response, do not patch silently.
- If x402 fields are missing:
  - keep run as incomplete and mark settlement binding as pending.
- If verifier fails:
  - treat as release blocker and fix mapping/canonicalization before retry.
