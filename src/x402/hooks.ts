import type { AgentRailEnvelope, AgentRailPaymentBinding, AgentRailReceiptRef } from "../core/types.js";
import type { EnvelopeDelivery, EnvelopeTransport, SendEnvelopeRequest } from "../transport/types.js";

export interface X402BindingPatch {
  payment?: AgentRailPaymentBinding;
  receiptRef?: AgentRailReceiptRef;
}

export interface X402BindingHook {
  beforeSend?<TPayload = unknown>(
    request: SendEnvelopeRequest<TPayload>
  ):
    | Promise<SendEnvelopeRequest<TPayload> | void>
    | SendEnvelopeRequest<TPayload>
    | void;
  afterReceive?<TRequestPayload = unknown, TResultPayload = unknown>(args: {
    request: SendEnvelopeRequest<TRequestPayload>;
    delivery: EnvelopeDelivery<TResultPayload>;
  }): Promise<X402BindingPatch | void> | X402BindingPatch | void;
}

export interface SendEnvelopeWithHooksOptions<TPayload = unknown> extends SendEnvelopeRequest<TPayload> {
  hooks?: X402BindingHook[];
}

function applyBindingPatch<TResultPayload>(
  envelope: AgentRailEnvelope<TResultPayload>,
  patch?: X402BindingPatch
): AgentRailEnvelope<TResultPayload> {
  if (!patch) return envelope;
  return {
    ...envelope,
    payment: patch.payment ?? envelope.payment,
    receiptRef: patch.receiptRef ?? envelope.receiptRef
  };
}

export async function sendEnvelopeWithHooks<TRequestPayload = unknown, TResultPayload = unknown>(
  transport: EnvelopeTransport,
  options: SendEnvelopeWithHooksOptions<TRequestPayload>
): Promise<EnvelopeDelivery<TResultPayload>> {
  const hooks = options.hooks || [];
  let request: SendEnvelopeRequest<TRequestPayload> = {
    endpoint: options.endpoint,
    envelope: options.envelope,
    headers: options.headers,
    timeoutMs: options.timeoutMs
  };

  for (const hook of hooks) {
    if (!hook.beforeSend) continue;
    const maybeUpdated = await hook.beforeSend(request);
    if (maybeUpdated) {
      request = maybeUpdated;
    }
  }

  let delivery = await transport.sendEnvelope<TRequestPayload, TResultPayload>(request);

  for (const hook of hooks) {
    if (!hook.afterReceive) continue;
    const patch = await hook.afterReceive({ request, delivery });
    if (patch) {
      delivery = {
        ...delivery,
        resultEnvelope: applyBindingPatch(delivery.resultEnvelope, patch) as AgentRailEnvelope<TResultPayload>
      };
    }
  }

  return delivery;
}
