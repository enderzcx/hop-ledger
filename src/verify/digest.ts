import crypto from "crypto";
import type { AgentRailEnvelope } from "../core/types.js";

export function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`).join(",")}}`;
}

export function sha256HexFromUtf8(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function digestStable(value: unknown): string {
  return sha256HexFromUtf8(stableSerialize(value));
}

export function canonicalEnvelope<TPayload>(envelope: AgentRailEnvelope<TPayload>): Record<string, unknown> {
  return {
    protocolVersion: envelope.protocolVersion,
    kind: envelope.kind,
    traceId: envelope.traceId,
    requestId: envelope.requestId,
    taskId: envelope.taskId,
    fromAgentId: envelope.fromAgentId,
    toAgentId: envelope.toAgentId,
    channel: envelope.channel,
    hopIndex: Number.isFinite(Number(envelope.hopIndex)) ? Number(envelope.hopIndex) : 0,
    conversationId: envelope.conversationId,
    messageId: envelope.messageId,
    createdAt: envelope.createdAt,
    payload: envelope.payload || {},
    status: envelope.status || "",
    phase: envelope.phase || "",
    payment: envelope.payment
      ? {
          mode: envelope.payment.mode,
          requestId: envelope.payment.requestId,
          txHash: envelope.payment.txHash,
          block: envelope.payment.block,
          status: envelope.payment.status,
          explorer: envelope.payment.explorer || "",
          verifiedAt: envelope.payment.verifiedAt || ""
        }
      : null,
    receiptRef: envelope.receiptRef
      ? {
          requestId: envelope.receiptRef.requestId,
          txHash: envelope.receiptRef.txHash,
          block: envelope.receiptRef.block,
          status: envelope.receiptRef.status,
          explorer: envelope.receiptRef.explorer || "",
          verifiedAt: envelope.receiptRef.verifiedAt || "",
          endpoint: envelope.receiptRef.endpoint || ""
        }
      : null,
    error: envelope.error || ""
  };
}

export function digestEnvelope<TPayload>(envelope: AgentRailEnvelope<TPayload>): string {
  return digestStable(canonicalEnvelope(envelope));
}
