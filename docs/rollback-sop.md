# Rollback SOP

This SOP applies to protocol, fixture, and verification changes in `hop-ledger`.

## Trigger Conditions
- Conformance checks fail in CI or local release gate.
- Verifier output diverges from committed expected digests.
- External adapter integration breaks after protocol/doc changes.

## Rollback Principles
- Do not rewrite shared history.
- Use `git revert` for pushed commits.
- Re-run verification gates after rollback.

## Steps
1. Identify bad commit(s):
   - `git log --oneline -n 20`
2. Revert commit(s):
   - `git revert <commit>`
3. Re-run verification:
   - `npm run typecheck`
   - `npm run build`
   - `npm run conformance`
4. Push revert commit:
   - `git push origin main`
5. Record incident in Dev Log with root cause and follow-up.

## Emergency Toggle Notes (main backend)
- Backend currently defaults to:
  - `KITE_ALLOW_EOA_RELAY_FALLBACK=0`
  - `KITE_ALLOW_BACKEND_USEROP_SIGN=0`
- Do not enable these in production unless an explicit incident response requires it.
