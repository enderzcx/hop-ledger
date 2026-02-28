# OpenClaw External Handoff Quickstart

This quickstart is for external teams integrating OpenClaw runtime output with HopLedger verification.

## 1. Install and build

```bash
npm install
npm run build
```

## 2. Prepare pilot env

Use `docs/openclaw-skill.env.example` as a template.

Minimum required values:
- `HOP_PILOT_MODE=skill`
- `HOP_PILOT_PAYER=<AA wallet address>`

Note:
- Do not use session key address as payer when strict proof matching is required.

## 3. Run pilot

```bash
npm run pilot:openclaw
```

When `HOP_PILOT_AUTO_PAY=1`, flow is automatic:
1. invoke skill and receive `402 payment_required`
2. call `/api/session/pay`
3. resubmit with payment proof

## 4. Inspect artifacts

Generated under `artifacts/pilot/<timestamp>/`:
- `task-envelope.json`
- `task-result.json`
- `run.json`
- `verification.json`
- `summary.json`

## 5. Verify with CLI

```bash
node dist/src/cli/verifier.js verify-envelope --file artifacts/pilot/<timestamp>/task-envelope.json
node dist/src/cli/verifier.js verify-run --file artifacts/pilot/<timestamp>/run.json
```

## 6. Verify with API mode

Start API:

```bash
npm run verify:api
```

Verify run:

```bash
curl -sS -X POST http://127.0.0.1:4411/verify/run \
  -H "content-type: application/json" \
  --data-binary @artifacts/pilot/<timestamp>/run.json
```

## 7. Artifact acceptance checklist

- `traceId/requestId/taskId` are continuous across envelope and result.
- `payment.requestId` equals envelope `requestId`.
- `verification.json` reports `runDigestMatch=true`.
- If parity check is required against KITE primitive:
  - `npm run parity:kite -- --artifact artifacts/pilot/<timestamp>`
