# Examples

- `openclaw-adapter.example.ts`
  - builds a `task-envelope`
  - builds a `task-result` with payment binding
  - computes deterministic digest
  - verifies digest with adapter helper

- `transport-x402-hooks.example.ts`
  - sends envelope through transport abstraction
  - receives result envelope via mock transport
  - applies x402 binding hooks after receive
