# Verifier API Deploy (Docker + Nginx)

This guide provides a minimal production-style deploy sample for verifier API mode.

## 1) Build image

From `hop-ledger` root:

```bash
docker build -f deploy/verifier-api/Dockerfile -t hop-ledger-verifier-api:local .
```

## 2) Run container

```bash
docker run -d \
  --name hop-ledger-verifier-api \
  -p 127.0.0.1:4411:4411 \
  -e HOP_VERIFY_API_HOST=0.0.0.0 \
  -e HOP_VERIFY_API_PORT=4411 \
  hop-ledger-verifier-api:local
```

Health check:

```bash
curl -sS http://127.0.0.1:4411/health
```

Run verify check:

```bash
curl -sS -X POST http://127.0.0.1:4411/verify/run \
  -H "content-type: application/json" \
  --data-binary @fixtures/contracts/run.fixture.json
```

## 3) Nginx reverse proxy

Use sample config:
- `deploy/verifier-api/nginx.verifier-api.conf`

Apply:

```bash
sudo cp deploy/verifier-api/nginx.verifier-api.conf /etc/nginx/conf.d/hop-ledger-verifier-api.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 4) Rollback

```bash
docker rm -f hop-ledger-verifier-api
```

Then deploy previous image tag.

For protocol-level rollback, follow `docs/rollback-sop.md`.
