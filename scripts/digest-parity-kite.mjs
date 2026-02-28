import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function stableSerialize(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`).join(",")}}`;
}

function sha256HexFromUtf8(input) {
  return crypto.createHash("sha256").update(String(input || ""), "utf8").digest("hex");
}

function digestStable(value) {
  return sha256HexFromUtf8(stableSerialize(value));
}

function canonicalEnvelope(envelope) {
  const payment = envelope?.payment && typeof envelope.payment === "object" ? envelope.payment : null;
  const receiptRef = envelope?.receiptRef && typeof envelope.receiptRef === "object" ? envelope.receiptRef : null;
  return {
    protocolVersion: envelope?.protocolVersion,
    kind: envelope?.kind,
    traceId: envelope?.traceId,
    requestId: envelope?.requestId,
    taskId: envelope?.taskId,
    fromAgentId: envelope?.fromAgentId,
    toAgentId: envelope?.toAgentId,
    channel: envelope?.channel,
    hopIndex: Number.isFinite(Number(envelope?.hopIndex)) ? Number(envelope.hopIndex) : 0,
    conversationId: envelope?.conversationId,
    messageId: envelope?.messageId,
    createdAt: envelope?.createdAt,
    payload: envelope?.payload || {},
    status: envelope?.status || "",
    phase: envelope?.phase || "",
    payment: payment
      ? {
          mode: payment.mode,
          requestId: payment.requestId,
          txHash: payment.txHash,
          block: payment.block,
          status: payment.status,
          explorer: payment.explorer || "",
          verifiedAt: payment.verifiedAt || ""
        }
      : null,
    receiptRef: receiptRef
      ? {
          requestId: receiptRef.requestId,
          txHash: receiptRef.txHash,
          block: receiptRef.block,
          status: receiptRef.status,
          explorer: receiptRef.explorer || "",
          verifiedAt: receiptRef.verifiedAt || "",
          endpoint: receiptRef.endpoint || ""
        }
      : null,
    error: envelope?.error || ""
  };
}

function digestRunFixtureWithKitePrimitive(run) {
  const material = {
    scope: "agentrail-run-v1",
    traceId: String(run?.traceId || ""),
    requestId: String(run?.requestId || ""),
    taskId: String(run?.taskId || ""),
    protocolVersion: String(run?.protocolVersion || ""),
    steps: (Array.isArray(run?.steps) ? run.steps : []).map((step) => ({
      name: step?.name,
      digest: digestStable(canonicalEnvelope(step?.envelope || {})),
      kind: step?.envelope?.kind,
      hopIndex: step?.envelope?.hopIndex,
      traceId: step?.envelope?.traceId,
      requestId: step?.envelope?.requestId,
      taskId: step?.envelope?.taskId
    }))
  };
  return digestStable(material);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getArg(name) {
  const needle = `--${name}`;
  const argv = process.argv.slice(2);
  const idx = argv.indexOf(needle);
  if (idx >= 0 && argv[idx + 1]) return String(argv[idx + 1]).trim();
  return "";
}

function resolveArtifactDir() {
  const explicit = getArg("artifact");
  if (explicit) return path.resolve(rootDir, explicit);
  const pilotRoot = path.resolve(rootDir, "artifacts", "pilot");
  const dirs = fs
    .readdirSync(pilotRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => Number(b) - Number(a));
  if (dirs.length === 0) {
    throw new Error(`No pilot artifacts found under ${pilotRoot}`);
  }
  return path.resolve(pilotRoot, dirs[0]);
}

function main() {
  const artifactDir = resolveArtifactDir();
  const taskEnvelope = readJson(path.join(artifactDir, "task-envelope.json"));
  const taskResult = readJson(path.join(artifactDir, "task-result.json"));
  const run = readJson(path.join(artifactDir, "run.json"));
  const summary = readJson(path.join(artifactDir, "summary.json"));

  const kiteTaskDigest = digestStable(canonicalEnvelope(taskEnvelope));
  const kiteResultDigest = digestStable(canonicalEnvelope(taskResult));
  const kiteRunDigest = digestRunFixtureWithKitePrimitive(run);

  const output = {
    ok: true,
    reference: {
      algorithm: "sha256",
      canonicalization: "stableSerialize",
      source: "KITE GASLESS backend digestStableObject"
    },
    artifactDir,
    requestId: String(summary?.requestId || taskEnvelope?.requestId || ""),
    traceId: String(summary?.traceId || taskEnvelope?.traceId || ""),
    checks: {
      taskDigest: {
        kite: kiteTaskDigest,
        hopLedger: String(summary?.taskDigest || ""),
        match: kiteTaskDigest === String(summary?.taskDigest || "")
      },
      resultDigest: {
        kite: kiteResultDigest,
        hopLedger: String(summary?.resultDigest || ""),
        match: kiteResultDigest === String(summary?.resultDigest || "")
      },
      runDigest: {
        kite: kiteRunDigest,
        hopLedger: String(summary?.runDigest || ""),
        match: kiteRunDigest === String(summary?.runDigest || "")
      }
    }
  };

  output.ok = Object.values(output.checks).every((item) => item.match);
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exit(1);
}

main();
