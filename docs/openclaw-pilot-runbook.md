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

## Pilot Runner

Command:

```bash
npm run pilot:openclaw
```

Modes (`HOP_PILOT_MODE`):
- `mock` (default): local dry run, no external dependency.
- `skill`: call KITE backend endpoint (`/api/skill/openclaw/invoke`) and map response to `task-result`.
- `agentrail`: call direct AgentRail endpoint expecting `resultEnvelope`.

Common env vars:
- `HOP_PILOT_MODE`
- `HOP_PILOT_API_KEY`
- `HOP_PILOT_CAPABILITY`
- `HOP_PILOT_SYMBOL`
- `HOP_PILOT_TP`
- `HOP_PILOT_SL`
- `HOP_PILOT_QTY`

Skill mode env vars:
- `HOP_PILOT_SKILL_ENDPOINT` (default `http://127.0.0.1:3001/api/skill/openclaw/invoke`)
- `HOP_PILOT_PAYER` (required in skill mode; use AA wallet address for strict proof match)
- `HOP_PILOT_SOURCE_AGENT_ID` (default `1`)
- `HOP_PILOT_TARGET_AGENT_ID` (default `2`)
- `HOP_PILOT_AUTO_PAY` (default `1`; auto run `challenge -> session pay -> proof submit`)
- `HOP_PILOT_PAY_ENDPOINT` (default `<skill-origin>/api/session/pay`)
- `HOP_PILOT_SESSION_ID` (optional override for session pay)
- `HOP_PILOT_PAY_ACTION` (default `reactive-stop-orders`)

AgentRail mode env var:
- `HOP_PILOT_ENDPOINT` (default `http://127.0.0.1:3001/agentrail`)

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

Skill mode payment flow (auto):
1. POST skill invoke without proof and read `402 payment_required`.
2. Call `/api/session/pay` using challenge `requestId/token/recipient/amount`.
3. Submit `paymentProof` to skill invoke and receive settled response.

Artifact output:
- `artifacts/pilot/<timestamp>/task-envelope.json`
- `artifacts/pilot/<timestamp>/task-result.json`
- `artifacts/pilot/<timestamp>/run.json`
- `artifacts/pilot/<timestamp>/verification.json`
- `artifacts/pilot/<timestamp>/summary.json`

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
