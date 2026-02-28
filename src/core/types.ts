export type AgentRailKind = "task-envelope" | "task-ack" | "task-phase" | "task-result";

export type AgentRailChannel = "dm" | "group" | "api";

export interface AgentRailPaymentBinding {
  mode: "x402" | "mock" | "none";
  requestId: string;
  txHash: string;
  block: number | null;
  status: string;
  explorer?: string;
  verifiedAt?: string;
}

export interface AgentRailReceiptRef {
  requestId: string;
  txHash: string;
  block: number | null;
  status: string;
  explorer?: string;
  verifiedAt?: string;
  endpoint?: string;
}

export interface AgentRailEnvelope<TPayload = unknown> {
  protocolVersion: "agentrail-v1";
  kind: AgentRailKind;
  traceId: string;
  requestId: string;
  taskId: string;
  fromAgentId: string;
  toAgentId: string;
  channel: AgentRailChannel;
  hopIndex: number;
  conversationId: string;
  messageId: string;
  createdAt: string;
  payload: TPayload;
  status?: string;
  phase?: string;
  payment?: AgentRailPaymentBinding;
  receiptRef?: AgentRailReceiptRef;
  error?: string;
}

export interface OpenClawTaskInput {
  capability: string;
  input: Record<string, unknown>;
}

export interface OpenClawTaskResult {
  summary: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface AgentRailContext {
  traceId: string;
  requestId: string;
  taskId: string;
  fromAgentId: string;
  toAgentId: string;
  channel: AgentRailChannel;
  hopIndex: number;
  conversationId: string;
  messageId: string;
  createdAt: string;
}
