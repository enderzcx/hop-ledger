# AgentRail Migration Notes: `agentrail-v1` -> `agentrail-v1.x`

This note defines the safe upgrade path for additive protocol updates within major line `v1`.

Reference:
- Spec version strategy: `specs/AGENTRAIL_SPEC.md` section "Version Strategy"
- Envelope contract: `src/core/types.ts`
- Verifier contract: `src/verify/contracts.ts`

## 1. Scope

Allowed in `agentrail-v1.x`:
- Add optional fields only.
- Add optional fields under existing optional blocks (`payment`, `receiptRef`).
- Keep canonical envelope required keys unchanged.

Not allowed in `agentrail-v1.x`:
- Removing existing required fields.
- Changing semantic meaning of required fields.
- Changing digest canonicalization rules for existing fields.

If any of the above breaking items are needed, bump to `agentrail-v2`.

## 2. Compatibility Matrix

| Producer | Verifier | Expected result |
|---|---|---|
| `agentrail-v1` | `agentrail-v1` | Pass |
| `agentrail-v1` | `agentrail-v1.x` | Pass |
| `agentrail-v1.x` (additive fields only) | `agentrail-v1` | Pass (unknown fields ignored) |
| `agentrail-v1.x` | `agentrail-v1.x` | Pass |

Note:
- Current verifier parses envelope shape and does not require strict protocol minor matching.
- Digest parity still depends on stable canonicalization of the common field set.

## 3. Producer Upgrade Checklist

1. Keep these required envelope keys unchanged:
   - `protocolVersion`, `kind`, `traceId`, `requestId`, `taskId`
   - `fromAgentId`, `toAgentId`, `channel`, `hopIndex`
   - `conversationId`, `messageId`, `createdAt`, `payload`
2. Ensure added fields are optional for downstream readers.
3. Keep `protocolVersion` in `agentrail-v1` line:
   - `agentrail-v1`
   - `agentrail-v1.<minor>` (example: `agentrail-v1.1`)
4. Regenerate fixtures if canonical material changes.

## 4. Verifier Upgrade Checklist

1. Verify both fixture and real run paths:
   - `verify-envelope`
   - `verify-run`
2. Ensure parser remains forward-compatible with unknown optional fields.
3. Keep failure mode explicit:
   - digest mismatch
   - invalid envelope/run shape
4. Re-run parity check against KITE primitive.

## 5. Recommended Rollout Steps

1. Cut a feature branch with `agentrail-v1.x` changes.
2. Update fixtures in `fixtures/contracts/`.
3. Run:

```bash
npm run build
npm run conformance
npm run verify:run -- --file fixtures/contracts/run.fixture.json
npm run parity:kite
```

4. Validate one real OpenClaw skill flow:

```bash
HOP_PILOT_MODE=skill
HOP_PILOT_PAYER=<aa_wallet>
HOP_PILOT_SESSION_ID=<session_id>
npm run pilot:openclaw
npm run parity:kite -- --artifact artifacts/pilot/<timestamp>
```

5. Publish release notes with:
   - Added fields list
   - No-breaking-change declaration
   - Rollback instructions

## 6. Rollback

If `agentrail-v1.x` rollout introduces verification regression:

1. Revert producer `protocolVersion` back to `agentrail-v1`.
2. Re-run `verify-run` on last known good fixture/artifact.
3. Keep new optional fields behind feature flags until verifier parity is restored.

## 7. Change Log Template

Use this template in PR/release notes:

```md
### AgentRail protocol update
- from: agentrail-v1
- to: agentrail-v1.x
- additive fields:
  - <field_a>
  - <field_b>
- digest/canonicalization impact: none
- verifier compatibility: backward compatible
- fixture updates:
  - fixtures/contracts/task-envelope.fixture.json
  - fixtures/contracts/task-result.fixture.json
  - fixtures/contracts/run.fixture.json
```
