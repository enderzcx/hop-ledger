# Digest Parity with KITE Reference

This note proves digest parity between:
- HopLedger digest implementation (`src/verify/digest.ts`, `src/verify/run.ts`)
- KITE reference primitive (`stableSerialize + sha256` from `backend/server.js`)

## Scope

Parity checks in this document are for:
- envelope digest (`task-envelope`, `task-result`)
- run digest (`agentrail-run-v1`)

These checks validate hashing/canonicalization parity, not business-level workflow equivalence.

## Mapping

HopLedger uses the envelope canonical fields:
- `protocolVersion`, `kind`, `traceId`, `requestId`, `taskId`
- `fromAgentId`, `toAgentId`, `channel`, `hopIndex`
- `conversationId`, `messageId`, `createdAt`
- `payload`, `status`, `phase`
- `payment.*`, `receiptRef.*`, `error`

KITE parity script (`scripts/digest-parity-kite.mjs`) rebuilds the same canonical envelope and hashes it with:
- `stableSerialize(value)` (sorted object keys, no `undefined`)
- `sha256(utf8(canonical))`

Run digest parity material:
- `scope: "agentrail-run-v1"`
- `traceId`, `requestId`, `taskId`, `protocolVersion`
- `steps[]: { name, digest, kind, hopIndex, traceId, requestId, taskId }`

## Command

Use latest pilot artifact:

```bash
npm run parity:kite
```

Use an explicit artifact:

```bash
npm run parity:kite -- --artifact artifacts/pilot/<timestamp>
```

## Expected Output

All `match` fields should be `true`:
- `checks.taskDigest.match`
- `checks.resultDigest.match`
- `checks.runDigest.match`

If any is `false`, treat as release-blocking for protocol integrity.
