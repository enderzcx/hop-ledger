import type { AgentRailEnvelope } from "../core/types.js";

export interface SendEnvelopeRequest<TPayload = unknown> {
  endpoint: string;
  envelope: AgentRailEnvelope<TPayload>;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface EnvelopeDelivery<TPayload = unknown> {
  endpoint: string;
  status: number;
  resultEnvelope: AgentRailEnvelope<TPayload>;
  rawBody?: unknown;
}

export interface EnvelopeTransport {
  sendEnvelope<TRequestPayload = unknown, TResultPayload = unknown>(
    request: SendEnvelopeRequest<TRequestPayload>
  ): Promise<EnvelopeDelivery<TResultPayload>>;
}
