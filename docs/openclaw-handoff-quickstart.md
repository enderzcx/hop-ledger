# OpenClaw External Handoff Quickstart

Goal: connect OpenClaw skill execution to HopLedger evidence in less than 10 minutes.

## 1. Install

```bash
npm install
npm run build
```

## 2. Set env (copy-paste)

Create `.env.local` (or export in shell):

```bash
HOP_PILOT_MODE=skill
HOP_PILOT_SKILL_ENDPOINT=http://127.0.0.1:3001/api/skill/openclaw/invoke
HOP_PILOT_PAY_ENDPOINT=http://127.0.0.1:3001/api/session/pay
HOP_PILOT_API_KEY=<agent_api_key>
HOP_PILOT_PAYER=<aa_wallet_address>
HOP_PILOT_SESSION_ID=<session_id_optional>
HOP_PILOT_AUTO_PAY=1
```

Notes:
- `HOP_PILOT_PAYER` should be AA wallet address, not session key address.
- `HOP_PILOT_AUTO_PAY=1` enables automatic `402 -> session pay -> proof submit`.

## 3. Run one pilot

```bash
npm run pilot:openclaw
```

Output includes `artifactDir`, `requestId`, and `runDigest`.

## 4. Verify artifacts

Assume artifact path is `artifacts/pilot/<timestamp>/`.

```bash
node dist/src/cli/verifier.js verify-envelope --file artifacts/pilot/<timestamp>/task-envelope.json
node dist/src/cli/verifier.js verify-run --file artifacts/pilot/<timestamp>/run.json
npm run parity:kite -- --artifact artifacts/pilot/<timestamp>
```

Expected:
- `verificationPassed=true`
- `runDigestMatch=true`
- parity `ok=true`

## 5. Verify using API mode (optional)

```bash
npm run verify:api
curl -sS http://127.0.0.1:4411/health
curl -sS -X POST http://127.0.0.1:4411/verify/run \
  -H "content-type: application/json" \
  --data-binary @artifacts/pilot/<timestamp>/run.json
```

## Acceptance Checklist

- `traceId/requestId/taskId` continuity is preserved.
- x402 `payment.requestId` equals envelope `requestId`.
- run verification and parity both pass.
- external engineer can run end-to-end without internal notes.
