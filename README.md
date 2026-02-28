# HopLedger

HopLedger is the AgentRail protocol layer for auditable agent-to-agent and agent-to-API execution.

## Positioning
- Brand: HopLedger
- Protocol layer: AgentRail
- Goal: verifiable execution with trace-linked payment and result evidence

## Directory
- `specs/` protocol and API contracts
- `adapters/openclaw/` OpenClaw integration adapter
- `examples/` minimal runnable examples

## Next
1. Define message envelope schema (traceId/requestId/taskId/hopIndex)
2. Define payment binding schema (x402 requestId/txHash/verifiedAt)
3. Publish OpenClaw adapter contract and quickstart
