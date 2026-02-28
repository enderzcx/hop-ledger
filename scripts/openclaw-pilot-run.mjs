import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  createHttpEnvelopeTransport,
  createMockEnvelopeTransport,
  createOpenClawAdapter,
  sendEnvelopeWithHooks,
  digestEnvelope
} from "../dist/src/index.js";
import { digestRunFixture, verifyRunFixture } from "../dist/src/verify/run.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readEnv(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function numberEnv(name, fallback) {
  const raw = readEnv(name, String(fallback));
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function extractTxHash(payload) {
  if (!payload || typeof payload !== "object") return "";
  const candidates = [
    payload?.payment?.txHash,
    payload?.paymentTxHash,
    payload?.txHash,
    payload?.receipt?.txHash,
    payload?.result?.payment?.txHash
  ];
  for (const item of candidates) {
    const value = String(item || "").trim();
    if (/^0x[a-fA-F0-9]{64}$/.test(value)) return value;
  }
  return "";
}

function isTruthy(value) {
  return /^(1|true|yes|on)$/i.test(String(value || "").trim());
}

function buildRequestHeaders(apiKey) {
  const headers = {
    "content-type": "application/json"
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  return headers;
}

async function postJson(url, { headers, body, label }) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const rawBody = await response.json().catch(() => ({}));
  return { response, rawBody, label };
}

function extractChallenge(rawBody) {
  const challenge = rawBody?.x402 && typeof rawBody.x402 === "object" ? rawBody.x402 : null;
  const accept = Array.isArray(challenge?.accepts) ? challenge.accepts[0] : null;
  const requestId = String(challenge?.requestId || "").trim();
  const tokenAddress = String(accept?.tokenAddress || "").trim();
  const recipient = String(accept?.recipient || "").trim();
  const amount = String(accept?.amount || "").trim();
  if (!requestId || !tokenAddress || !recipient || !amount) {
    return null;
  }
  return { requestId, tokenAddress, recipient, amount };
}

function createSkillTransport({
  adapter,
  endpoint,
  apiKey,
  payer,
  sourceAgentId,
  targetAgentId,
  autoPay,
  payEndpoint,
  action,
  sessionId
}) {
  if (!endpoint) {
    throw new Error("Skill mode requires HOP_PILOT_SKILL_ENDPOINT.");
  }
  if (!payer) {
    throw new Error("Skill mode requires HOP_PILOT_PAYER.");
  }

  return createMockEnvelopeTransport({
    async handler(request) {
      const taskPayload = request.envelope?.payload || {};
      const input = taskPayload?.input && typeof taskPayload.input === "object" ? taskPayload.input : {};
      const task = {
        symbol: String(input.symbol || "BTC-USDT"),
        takeProfit: numberEnv("HOP_PILOT_TP", Number(input.takeProfit || 80000)),
        stopLoss: numberEnv("HOP_PILOT_SL", Number(input.stopLoss || 50000)),
        ...(Number.isFinite(Number(input.quantity)) ? { quantity: Number(input.quantity) } : {})
      };

      const body = {
        payer,
        sourceAgentId: sourceAgentId || "1",
        targetAgentId: targetAgentId || "2",
        requestId: request.envelope.requestId,
        task
      };

      const headers = buildRequestHeaders(apiKey);
      let { response, rawBody } = await postJson(endpoint, {
        headers,
        body,
        label: "skill-invoke"
      });

      if (response.status === 402 && autoPay) {
        const challenge = extractChallenge(rawBody);
        if (!challenge) {
          throw new Error(
            `Skill endpoint returned 402 but challenge payload is malformed: ${String(
              rawBody?.reason || rawBody?.error || "unknown"
            )}`
          );
        }

        const payBody = {
          tokenAddress: challenge.tokenAddress,
          recipient: challenge.recipient,
          amount: challenge.amount,
          requestId: challenge.requestId,
          action,
          query: `A2A stop-order ${task.symbol} tp=${task.takeProfit} sl=${task.stopLoss}${
            Number.isFinite(Number(task.quantity)) ? ` qty=${task.quantity}` : ""
          }`,
          ...(sessionId ? { sessionId } : {})
        };
        const { response: payResponse, rawBody: payRawBody } = await postJson(payEndpoint, {
          headers,
          body: payBody,
          label: "session-pay"
        });
        if (!payResponse.ok || payRawBody?.ok === false) {
          throw new Error(
            `Session pay failed (${payResponse.status}): ${String(
              payRawBody?.reason || payRawBody?.error || "unknown"
            )}`
          );
        }
        const txHash = String(payRawBody?.payment?.txHash || "").trim();
        if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
          throw new Error("Session pay returned invalid txHash.");
        }

        const proofBody = {
          ...body,
          requestId: challenge.requestId,
          paymentProof: {
            requestId: challenge.requestId,
            txHash,
            payer,
            tokenAddress: challenge.tokenAddress,
            recipient: challenge.recipient,
            amount: challenge.amount
          }
        };

        const proofResult = await postJson(endpoint, {
          headers,
          body: proofBody,
          label: "skill-proof-submit"
        });
        response = proofResult.response;
        rawBody = {
          ...(proofResult.rawBody || {}),
          pilot: {
            autoPay: true,
            challengeRequestId: challenge.requestId,
            sessionPayTxHash: txHash
          }
        };
      }

      if (!response.ok || rawBody?.ok === false) {
        throw new Error(
          `Skill endpoint failed (${response.status}): ${String(rawBody?.reason || rawBody?.error || "unknown")}`
        );
      }

      const summary =
        String(rawBody?.summary || rawBody?.result?.summary || rawBody?.message || "").trim() ||
        "OpenClaw skill invoke completed.";

      const resultEnvelope = adapter.toTaskResult(
        {
          summary,
          data: {
            mode: "skill-endpoint",
            endpoint,
            response: rawBody
          }
        },
        {
          ...request.envelope,
          kind: "task-result",
          fromAgentId: request.envelope.toAgentId,
          toAgentId: request.envelope.fromAgentId,
          hopIndex: Number(request.envelope.hopIndex || 0) + 1,
          messageId: `${request.envelope.messageId}_result`,
          createdAt: nowIso()
        }
      );

      return {
        endpoint,
        status: response.status,
        resultEnvelope,
        rawBody
      };
    }
  });
}

function createPaymentHook() {
  return {
    afterReceive: ({ request, delivery }) => {
      const raw = delivery.rawBody || {};
      const txHash = extractTxHash(raw);
      if (!txHash) return undefined;
      const blockRaw = Number(raw?.block || raw?.payment?.block || raw?.receipt?.block || 0);
      const block = Number.isFinite(blockRaw) && blockRaw > 0 ? blockRaw : null;
      return {
        payment: {
          mode: "x402",
          requestId: request.envelope.requestId,
          txHash,
          block,
          status: String(raw?.status || raw?.payment?.status || "success"),
          explorer: `https://testnet.kitescan.ai/tx/${txHash}`,
          verifiedAt: nowIso()
        },
        receiptRef: {
          requestId: request.envelope.requestId,
          txHash,
          block,
          status: String(raw?.status || raw?.payment?.status || "success"),
          endpoint: readEnv("HOP_PILOT_RECEIPT_ENDPOINT", "/api/receipt/{requestId}").replace(
            "{requestId}",
            request.envelope.requestId
          )
        }
      };
    }
  };
}

async function main() {
  const mode = readEnv("HOP_PILOT_MODE", "mock").toLowerCase();
  const endpoint = readEnv("HOP_PILOT_ENDPOINT", "http://127.0.0.1:3001/agentrail");
  const skillEndpoint = readEnv("HOP_PILOT_SKILL_ENDPOINT", "http://127.0.0.1:3001/api/skill/openclaw/invoke");
  const skillBaseOrigin = new URL(skillEndpoint).origin;
  const payEndpoint = readEnv("HOP_PILOT_PAY_ENDPOINT", `${skillBaseOrigin}/api/session/pay`);
  const apiKey = readEnv("HOP_PILOT_API_KEY");
  const payer = readEnv("HOP_PILOT_PAYER");
  const sessionId = readEnv("HOP_PILOT_SESSION_ID");
  const action = readEnv("HOP_PILOT_PAY_ACTION", "reactive-stop-orders");
  const autoPay = isTruthy(readEnv("HOP_PILOT_AUTO_PAY", "1"));
  const sourceAgentId = readEnv("HOP_PILOT_SOURCE_AGENT_ID", "1");
  const targetAgentId = readEnv("HOP_PILOT_TARGET_AGENT_ID", "2");
  const capability = readEnv("HOP_PILOT_CAPABILITY", "reactive-stop-orders");
  const symbol = readEnv("HOP_PILOT_SYMBOL", "BTC-USDT");
  const takeProfit = numberEnv("HOP_PILOT_TP", 80000);
  const stopLoss = numberEnv("HOP_PILOT_SL", 50000);
  const quantity = numberEnv("HOP_PILOT_QTY", 0);

  const adapter = createOpenClawAdapter();
  const context = {
    traceId: id("trace"),
    requestId: id("request"),
    taskId: id("task"),
    fromAgentId: "router-agent",
    toAgentId: "openclaw-agent",
    channel: "api",
    hopIndex: 1,
    conversationId: id("conv"),
    messageId: id("msg"),
    createdAt: nowIso()
  };

  const taskEnvelope = adapter.toTaskEnvelope(
    {
      capability,
      input: {
        symbol,
        takeProfit,
        stopLoss,
        ...(quantity > 0 ? { quantity } : {})
      }
    },
    context
  );

  let transport;
  if (mode === "agentrail") {
    transport = createHttpEnvelopeTransport();
  } else if (mode === "skill") {
    transport = createSkillTransport({
      adapter,
      endpoint: skillEndpoint,
      apiKey,
      payer,
      sourceAgentId,
      targetAgentId,
      autoPay,
      payEndpoint,
      action,
      sessionId
    });
  } else {
    transport = createMockEnvelopeTransport({
      async handler(request) {
        const resultEnvelope = adapter.toTaskResult(
          {
            summary: "Mock pilot completed.",
            data: { mode: "mock", input: request.envelope.payload }
          },
          {
            ...context,
            fromAgentId: "openclaw-agent",
            toAgentId: "router-agent",
            hopIndex: 2,
            messageId: `${context.messageId}_result`,
            createdAt: nowIso()
          }
        );
        return {
          endpoint: "mock://openclaw",
          status: 200,
          resultEnvelope,
          rawBody: {
            ok: true,
            mode: "mock",
            payment: {
              txHash: `0x${"a".repeat(64)}`,
              block: 20260099,
              status: "success"
            }
          }
        };
      }
    });
  }

  const delivery = await sendEnvelopeWithHooks(transport, {
    endpoint: mode === "agentrail" ? endpoint : mode === "skill" ? skillEndpoint : "mock://openclaw",
    envelope: taskEnvelope,
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
    timeoutMs: 60_000,
    hooks: [createPaymentHook()]
  });

  const taskDigest = digestEnvelope(taskEnvelope);
  const resultDigest = digestEnvelope(delivery.resultEnvelope);
  const runFixture = {
    schemaVersion: "agentrail-run-v1",
    protocolVersion: "agentrail-v1",
    traceId: taskEnvelope.traceId,
    requestId: taskEnvelope.requestId,
    taskId: taskEnvelope.taskId,
    steps: [
      {
        name: "task-envelope",
        envelope: taskEnvelope,
        expectedDigest: taskDigest
      },
      {
        name: "task-result",
        envelope: delivery.resultEnvelope,
        expectedDigest: resultDigest
      }
    ]
  };
  runFixture.expectedRunDigest = digestRunFixture(runFixture);
  const runVerification = verifyRunFixture(runFixture);

  const artifactDir = path.resolve(rootDir, "artifacts", "pilot", `${Date.now()}`);
  ensureDir(artifactDir);
  writeJson(path.join(artifactDir, "task-envelope.json"), taskEnvelope);
  writeJson(path.join(artifactDir, "task-result.json"), delivery.resultEnvelope);
  writeJson(path.join(artifactDir, "run.json"), runFixture);
  writeJson(path.join(artifactDir, "raw-response.json"), delivery.rawBody || {});
  writeJson(path.join(artifactDir, "verification.json"), runVerification);

  const summary = {
    ok: runVerification.runDigestMatch && runVerification.envelopeResults.every((item) => item.digestMatch),
    mode,
    endpoint: mode === "agentrail" ? endpoint : mode === "skill" ? skillEndpoint : "mock://openclaw",
    artifactDir,
    requestId: taskEnvelope.requestId,
    traceId: taskEnvelope.traceId,
    taskDigest,
    resultDigest,
    runDigest: runVerification.runDigest
  };
  writeJson(path.join(artifactDir, "summary.json"), summary);
  console.log(JSON.stringify(summary, null, 2));

  if (!summary.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
