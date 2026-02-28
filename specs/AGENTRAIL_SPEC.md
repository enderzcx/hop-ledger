# AgentRail Spec v0

## Required IDs
- traceId
- requestId
- taskId
- conversationId
- messageId
- hopIndex

## Lifecycle
1. task-envelope
2. task-ack (optional)
3. task-phase (optional)
4. task-result

## Audit Binding
- Every result should carry payment.requestId and receiptRef.requestId when settled.
- Export package must include schemaVersion and deterministic digest.
