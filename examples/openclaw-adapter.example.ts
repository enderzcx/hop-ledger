import { createOpenClawAdapter, digestEnvelope, type AgentRailContext } from "../src/index.js";

const adapter = createOpenClawAdapter();

const ctx: AgentRailContext = {
  traceId: "trace_demo_001",
  requestId: "x402_demo_001",
  taskId: "task_demo_001",
  fromAgentId: "router-agent",
  toAgentId: "openclaw-agent",
  channel: "dm",
  hopIndex: 1,
  conversationId: "conversation_demo_001",
  messageId: "message_demo_001",
  createdAt: new Date().toISOString()
};

const taskEnvelope = adapter.toTaskEnvelope(
  {
    capability: "info-analysis-feed",
    input: {
      url: "https://newshacker.me/",
      topic: "market sentiment"
    }
  },
  ctx
);

const resultEnvelope = adapter.toTaskResult(
  {
    summary: "OpenClaw analyzed 8 items and returned neutral sentiment.",
    data: { sentimentScore: 0.04, source: "openclaw" }
  },
  {
    ...ctx,
    fromAgentId: "openclaw-agent",
    toAgentId: "router-agent",
    hopIndex: 2,
    messageId: "message_demo_002"
  },
  {
    payment: {
      mode: "x402",
      requestId: "x402_demo_001",
      txHash: "0xabc123",
      block: 20109139,
      status: "success",
      explorer: "https://testnet.kitescan.ai/tx/0xabc123",
      verifiedAt: new Date().toISOString()
    },
    receiptRef: {
      requestId: "x402_demo_001",
      txHash: "0xabc123",
      block: 20109139,
      status: "success",
      endpoint: "/api/receipt/x402_demo_001"
    }
  }
);

const taskDigest = digestEnvelope(taskEnvelope);
const resultDigest = digestEnvelope(resultEnvelope);

console.log(
  JSON.stringify(
    {
      taskEnvelope,
      taskDigest,
      resultEnvelope,
      resultDigest,
      digestVerified: adapter.verifyEnvelopeDigest(resultEnvelope, resultDigest)
    },
    null,
    2
  )
);
