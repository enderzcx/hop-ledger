# Verifier API Container Live Check (2026-03-01)

## Scope
- Image build from `deploy/verifier-api/Dockerfile`
- Runtime check for:
  - `GET /health`
  - `POST /verify/run`

## Commands Executed

```bash
docker build -f deploy/verifier-api/Dockerfile -t hop-verifier-api:local .
docker run -d --name hop-verifier-api-local -p 4411:4411 hop-verifier-api:local
curl -sS http://127.0.0.1:4411/health
curl -sS -X POST http://127.0.0.1:4411/verify/run \
  -H "content-type: application/json" \
  --data-binary @fixtures/contracts/run.fixture.json
docker logs --tail 40 hop-verifier-api-local
docker rm -f hop-verifier-api-local
```

## Result
- Build: passed
- Container start: passed
- `/health`: `{"ok":true,"service":"hop-verifier-api"}`
- `/verify/run`: passed with
  - `verificationPassed=true`
  - `runDigestMatch=true`
  - `failedEnvelopeCount=0`

## Conclusion
- Verifier API container path is live and ready for deployment handoff.
