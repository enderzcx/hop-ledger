import type { AgentRailEnvelope } from "../core/types.js";
import type { EnvelopeFixture, RunFixture } from "./run.js";

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
    typeof value.taskId === "string" &&
    typeof value.fromAgentId === "string" &&
    typeof value.toAgentId === "string"
  );
}

export function normalizeDigest(value: string | undefined): string | undefined {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || undefined;
}

export function toEnvelopeFixture(payload: unknown, expectedDigest?: string): EnvelopeFixture {
  if (isObject(payload) && isEnvelope(payload.envelope)) {
    return {
      name: typeof payload.name === "string" ? payload.name : "fixture-envelope",
      envelope: payload.envelope,
      expectedDigest: normalizeDigest(expectedDigest || String(payload.expectedDigest || ""))
    };
  }
  if (isEnvelope(payload)) {
    return {
      name: "envelope",
      envelope: payload,
      expectedDigest: normalizeDigest(expectedDigest)
    };
  }
  throw new Error("Invalid envelope payload.");
}

export function toRunFixture(payload: unknown): RunFixture {
  if (!isObject(payload) || !Array.isArray(payload.steps)) {
    throw new Error("Run file must contain a `steps` array.");
  }
  const steps = payload.steps.map((step, index) => {
    if (!isObject(step) || !isEnvelope(step.envelope)) {
      throw new Error(`Invalid run step at index ${index}.`);
    }
    return {
      name: typeof step.name === "string" ? step.name : `step-${index}`,
      envelope: step.envelope,
      expectedDigest:
        typeof step.expectedDigest === "string" ? normalizeDigest(step.expectedDigest) : undefined
    };
  });

  return {
    schemaVersion: typeof payload.schemaVersion === "string" ? payload.schemaVersion : undefined,
    protocolVersion:
      typeof payload.protocolVersion === "string" ? payload.protocolVersion : undefined,
    traceId: typeof payload.traceId === "string" ? payload.traceId : undefined,
    requestId: typeof payload.requestId === "string" ? payload.requestId : undefined,
    taskId: typeof payload.taskId === "string" ? payload.taskId : undefined,
    steps,
    expectedRunDigest:
      typeof payload.expectedRunDigest === "string"
        ? normalizeDigest(payload.expectedRunDigest)
        : undefined
  };
}
