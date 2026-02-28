# Verifier API Mode

HopLedger supports a minimal HTTP verifier service in addition to CLI commands.

## Start

```bash
npm run verify:api
```

Default bind:
- Host: `127.0.0.1`
- Port: `4411`
- Body limit: `1048576` bytes

Optional env vars:
- `HOP_VERIFY_API_HOST`
- `HOP_VERIFY_API_PORT`
- `HOP_VERIFY_API_BODY_LIMIT`

## Endpoints

### `GET /health`

Response:

```json
{
  "ok": true,
  "service": "hop-verifier-api"
}
```

### `POST /verify/envelope`

Accepts:
1. Raw AgentRail envelope JSON
2. Envelope fixture JSON: `{ "name": "...", "envelope": {...}, "expectedDigest": "..." }`

Optional expected digest:
- Body field: `expectedDigest`
- Query param: `?expectedDigest=<hex>`

Example:

```bash
curl -sS -X POST "http://127.0.0.1:4411/verify/envelope" \
  -H "content-type: application/json" \
  --data-binary @fixtures/contracts/task-envelope.fixture.json
```

Response shape:

```json
{
  "ok": true,
  "command": "verify-envelope",
  "verificationPassed": true,
  "name": "fixture-task-envelope",
  "expectedDigest": "hex-or-null",
  "actualDigest": "hex",
  "digestMatch": true
}
```

### `POST /verify/run`

Accepts run fixture JSON (`steps[]` required).

Example:

```bash
curl -sS -X POST "http://127.0.0.1:4411/verify/run" \
  -H "content-type: application/json" \
  --data-binary @fixtures/contracts/run.fixture.json
```

Response shape:

```json
{
  "ok": true,
  "command": "verify-run",
  "verificationPassed": true,
  "runDigest": "hex",
  "expectedRunDigest": "hex-or-null",
  "runDigestMatch": true,
  "failedEnvelopeCount": 0,
  "envelopeChecks": []
}
```

## Error Handling

- `400`: invalid JSON or invalid contract payload.
- `404`: unsupported route.
- `413`: request body too large.

Digest mismatch is returned as a normal `200` response with `verificationPassed: false`.
