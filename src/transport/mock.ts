import type { EnvelopeDelivery, EnvelopeTransport, SendEnvelopeRequest } from "./types.js";

export interface MockEnvelopeTransportOptions {
  handler: (
    request: SendEnvelopeRequest<unknown>
  ) => Promise<EnvelopeDelivery<unknown>> | EnvelopeDelivery<unknown>;
}

export function createMockEnvelopeTransport(options: MockEnvelopeTransportOptions): EnvelopeTransport {
  if (!options || typeof options.handler !== "function") {
    throw new Error("createMockEnvelopeTransport requires a handler function.");
  }
  return {
    sendEnvelope<TRequestPayload = unknown, TResultPayload = unknown>(
      request: SendEnvelopeRequest<TRequestPayload>
    ) {
      return Promise.resolve(
        options.handler(request as SendEnvelopeRequest<unknown>)
      ) as Promise<EnvelopeDelivery<TResultPayload>>;
    }
  };
}
