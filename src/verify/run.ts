import type { AgentRailEnvelope } from "../core/types.js";
import { digestEnvelope, digestStable } from "./digest.js";

export interface EnvelopeFixture {
  name: string;
  envelope: AgentRailEnvelope;
  expectedDigest?: string;
}

export interface RunFixtureStep extends EnvelopeFixture {}

export interface RunFixture {
  schemaVersion?: string;
  traceId?: string;
  requestId?: string;
  taskId?: string;
  protocolVersion?: string;
  steps: RunFixtureStep[];
  expectedRunDigest?: string;
}

export interface EnvelopeVerificationResult {
  name: string;
  expectedDigest?: string;
  actualDigest: string;
  digestMatch: boolean;
}

export interface RunVerificationResult {
  runDigest: string;
  expectedRunDigest?: string;
  runDigestMatch: boolean;
  envelopeResults: EnvelopeVerificationResult[];
}

function normalizeDigest(input: string | undefined): string | undefined {
  const value = String(input || "").trim().toLowerCase();
  return value || undefined;
}

export function verifyEnvelopeFixture(fixture: EnvelopeFixture): EnvelopeVerificationResult {
  const actualDigest = digestEnvelope(fixture.envelope);
  const expectedDigest = normalizeDigest(fixture.expectedDigest);
  return {
    name: fixture.name,
    expectedDigest,
    actualDigest,
    digestMatch: expectedDigest ? actualDigest === expectedDigest : true
  };
}

export function digestRunFixture(run: RunFixture): string {
  const material = {
    scope: "agentrail-run-v1",
    traceId: String(run.traceId || ""),
    requestId: String(run.requestId || ""),
    taskId: String(run.taskId || ""),
    protocolVersion: String(run.protocolVersion || ""),
    steps: run.steps.map((step) => ({
      name: step.name,
      digest: digestEnvelope(step.envelope),
      kind: step.envelope.kind,
      hopIndex: step.envelope.hopIndex,
      traceId: step.envelope.traceId,
      requestId: step.envelope.requestId,
      taskId: step.envelope.taskId
    }))
  };
  return digestStable(material);
}

export function verifyRunFixture(run: RunFixture): RunVerificationResult {
  const envelopeResults = run.steps.map((step) => verifyEnvelopeFixture(step));
  const runDigest = digestRunFixture(run);
  const expectedRunDigest = normalizeDigest(run.expectedRunDigest);
  return {
    runDigest,
    expectedRunDigest,
    runDigestMatch: expectedRunDigest ? runDigest === expectedRunDigest : true,
    envelopeResults
  };
}
