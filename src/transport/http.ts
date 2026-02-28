import type { AgentRailEnvelope } from "../core/types.js";
import type { EnvelopeDelivery, EnvelopeTransport, SendEnvelopeRequest } from "./types.js";

type FetchLike = typeof fetch;

export interface HttpEnvelopeTransportOptions {
  fetchImpl?: FetchLike;
  defaultHeaders?: Record<string, string>;
  parseResultEnvelope?: (body: unknown) => AgentRailEnvelope;
  serializeBody?: (envelope: AgentRailEnvelope) => unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEnvelope(value: unknown): value is AgentRailEnvelope {
  return (
    isObject(value) &&
    typeof value.protocolVersion === "string" &&
    typeof value.kind === "string" &&
    typeof value.traceId === "string" &&
    typeof value.requestId === "string" &&
    typeof value.taskId === "string"
  );
}

function defaultParseResultEnvelope(body: unknown): AgentRailEnvelope {
  if (isObject(body) && isEnvelope(body.resultEnvelope)) {
    return body.resultEnvelope;
  }
  if (isObject(body) && isEnvelope(body.envelope)) {
    return body.envelope;
  }
  if (isEnvelope(body)) {
    return body;
  }
  throw new Error("Transport response does not contain a valid AgentRail envelope.");
}

function defaultSerializeBody(envelope: AgentRailEnvelope): unknown {
  return { envelope };
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const raw = await response.text();
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return { raw: trimmed };
  }
}

function normalizeEndpoint(endpoint: string): string {
  const normalized = String(endpoint || "").trim();
  if (!normalized) throw new Error("Transport endpoint must not be empty.");
  return normalized;
}

export function createHttpEnvelopeTransport(options: HttpEnvelopeTransportOptions = {}): EnvelopeTransport {
  const fetchImpl = options.fetchImpl || fetch;
  const parseResultEnvelope = options.parseResultEnvelope || defaultParseResultEnvelope;
  const serializeBody = options.serializeBody || defaultSerializeBody;

  return {
    async sendEnvelope<TRequestPayload = unknown, TResultPayload = unknown>(
      request: SendEnvelopeRequest<TRequestPayload>
    ): Promise<EnvelopeDelivery<TResultPayload>> {
      const endpoint = normalizeEndpoint(request.endpoint);
      const controller = new AbortController();
      const timeoutMs = Number(request.timeoutMs);
      const hasTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0;
      const timer = hasTimeout
        ? setTimeout(() => controller.abort(new Error(`Request timeout after ${timeoutMs}ms.`)), timeoutMs)
        : null;

      try {
        const body = serializeBody(request.envelope);
        const response = await fetchImpl(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            ...(options.defaultHeaders || {}),
            ...(request.headers || {})
          },
          body: JSON.stringify(body)
        });

        const responseBody = await readResponseBody(response);
        if (!response.ok) {
          throw new Error(
            `Transport request failed (${response.status}): ${JSON.stringify(responseBody)}`
          );
        }

        return {
          endpoint,
          status: response.status,
          rawBody: responseBody,
          resultEnvelope: parseResultEnvelope(responseBody) as AgentRailEnvelope<TResultPayload>
        };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  };
}
