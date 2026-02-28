import type {
  AgentRailContext,
  AgentRailEnvelope,
  AgentRailPaymentBinding,
  AgentRailReceiptRef,
  OpenClawTaskInput,
  OpenClawTaskResult
} from "../core/types.js";
import { digestEnvelope } from "../verify/digest.js";

export interface OpenClawAdapterContract {
  toTaskEnvelope(input: OpenClawTaskInput, ctx: AgentRailContext): AgentRailEnvelope<OpenClawTaskInput>;
  toTaskResult(
    result: OpenClawTaskResult,
    ctx: AgentRailContext,
    options?: {
      payment?: AgentRailPaymentBinding;
      receiptRef?: AgentRailReceiptRef;
    }
  ): AgentRailEnvelope<OpenClawTaskResult>;
  verifyEnvelopeDigest(envelope: AgentRailEnvelope, expectedDigest: string): boolean;
}

function ensureIso(dateValue: string): string {
  const input = String(dateValue || "").trim();
  if (!input) return new Date().toISOString();
  const parsed = Date.parse(input);
  if (!Number.isFinite(parsed)) return new Date().toISOString();
  return new Date(parsed).toISOString();
}

function normalizeContext(ctx: AgentRailContext): AgentRailContext {
  return {
    ...ctx,
    traceId: String(ctx.traceId || "").trim(),
    requestId: String(ctx.requestId || "").trim(),
    taskId: String(ctx.taskId || "").trim(),
    fromAgentId: String(ctx.fromAgentId || "").trim(),
    toAgentId: String(ctx.toAgentId || "").trim(),
    conversationId: String(ctx.conversationId || "").trim(),
    messageId: String(ctx.messageId || "").trim(),
    hopIndex: Number.isFinite(Number(ctx.hopIndex)) ? Number(ctx.hopIndex) : 0,
    createdAt: ensureIso(ctx.createdAt)
  };
}

export function createOpenClawAdapter(): OpenClawAdapterContract {
  return {
    toTaskEnvelope(input, ctx) {
      const safeCtx = normalizeContext(ctx);
      return {
        protocolVersion: "agentrail-v1",
        kind: "task-envelope",
        traceId: safeCtx.traceId,
        requestId: safeCtx.requestId,
        taskId: safeCtx.taskId,
        fromAgentId: safeCtx.fromAgentId,
        toAgentId: safeCtx.toAgentId,
        channel: safeCtx.channel,
        hopIndex: safeCtx.hopIndex,
        conversationId: safeCtx.conversationId,
        messageId: safeCtx.messageId,
        createdAt: safeCtx.createdAt,
        payload: {
          capability: String(input?.capability || "").trim(),
          input: input?.input && typeof input.input === "object" ? input.input : {}
        }
      };
    },
    toTaskResult(result, ctx, options = {}) {
      const safeCtx = normalizeContext(ctx);
      return {
        protocolVersion: "agentrail-v1",
        kind: "task-result",
        traceId: safeCtx.traceId,
        requestId: safeCtx.requestId,
        taskId: safeCtx.taskId,
        fromAgentId: safeCtx.fromAgentId,
        toAgentId: safeCtx.toAgentId,
        channel: safeCtx.channel,
        hopIndex: safeCtx.hopIndex,
        conversationId: safeCtx.conversationId,
        messageId: safeCtx.messageId,
        createdAt: safeCtx.createdAt,
        status: result?.error ? "failed" : "done",
        payload: {
          summary: String(result?.summary || "").trim(),
          data: result?.data && typeof result.data === "object" ? result.data : {},
          error: String(result?.error || "").trim()
        },
        payment: options.payment || undefined,
        receiptRef: options.receiptRef || undefined,
        error: String(result?.error || "").trim() || undefined
      };
    },
    verifyEnvelopeDigest(envelope, expectedDigest) {
      const actual = digestEnvelope(envelope);
      return actual === String(expectedDigest || "").trim().toLowerCase();
    }
  };
}
