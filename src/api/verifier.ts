import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { toEnvelopeFixture, toRunFixture } from "../verify/contracts.js";
import { verifyEnvelopeFixture, verifyRunFixture } from "../verify/run.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4411;
const DEFAULT_BODY_LIMIT_BYTES = 1024 * 1024;

interface VerifierApiConfig {
  host?: string;
  port?: number;
  bodyLimitBytes?: number;
}

function toPositiveNumber(input: string | undefined, fallback: number): number {
  const value = Number(input);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function json(
  res: ServerResponse<IncomingMessage>,
  statusCode: number,
  payload: Record<string, unknown>
): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJsonBody(
  req: IncomingMessage,
  bodyLimitBytes: number
): Promise<{ ok: true; value: unknown } | { ok: false; statusCode: number; error: string }> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > bodyLimitBytes) {
      return { ok: false, statusCode: 413, error: "Request body exceeds size limit." };
    }
    chunks.push(buf);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    return { ok: false, statusCode: 400, error: "Empty JSON body." };
  }

  try {
    return { ok: true, value: JSON.parse(rawBody) };
  } catch {
    return { ok: false, statusCode: 400, error: "Invalid JSON body." };
  }
}

function resolveExpectedDigest(
  body: unknown,
  queryExpectedDigest: string | undefined
): string | undefined {
  if (queryExpectedDigest) return queryExpectedDigest;
  if (isRecord(body) && typeof body.expectedDigest === "string") {
    return body.expectedDigest;
  }
  return undefined;
}

async function handleEnvelopeVerify(
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
  bodyLimitBytes: number,
  queryExpectedDigest: string | undefined
): Promise<void> {
  const parsed = await readJsonBody(req, bodyLimitBytes);
  if (!parsed.ok) {
    json(res, parsed.statusCode, { ok: false, error: parsed.error });
    return;
  }

  try {
    const fixture = toEnvelopeFixture(parsed.value, resolveExpectedDigest(parsed.value, queryExpectedDigest));
    const result = verifyEnvelopeFixture(fixture);
    json(res, 200, {
      ok: true,
      command: "verify-envelope",
      verificationPassed: result.digestMatch,
      name: result.name,
      expectedDigest: result.expectedDigest || null,
      actualDigest: result.actualDigest,
      digestMatch: result.digestMatch
    });
  } catch (error) {
    json(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function handleRunVerify(
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
  bodyLimitBytes: number
): Promise<void> {
  const parsed = await readJsonBody(req, bodyLimitBytes);
  if (!parsed.ok) {
    json(res, parsed.statusCode, { ok: false, error: parsed.error });
    return;
  }

  try {
    const fixture = toRunFixture(parsed.value);
    const result = verifyRunFixture(fixture);
    const failedEnvelopeCount = result.envelopeResults.filter((entry) => !entry.digestMatch).length;
    json(res, 200, {
      ok: true,
      command: "verify-run",
      verificationPassed: result.runDigestMatch && failedEnvelopeCount === 0,
      runDigest: result.runDigest,
      expectedRunDigest: result.expectedRunDigest || null,
      runDigestMatch: result.runDigestMatch,
      failedEnvelopeCount,
      envelopeChecks: result.envelopeResults.map((entry) => ({
        name: entry.name,
        expectedDigest: entry.expectedDigest || null,
        actualDigest: entry.actualDigest,
        digestMatch: entry.digestMatch
      }))
    });
  } catch (error) {
    json(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export function createVerifierApiServer(config: VerifierApiConfig = {}): http.Server {
  const bodyLimitBytes = config.bodyLimitBytes || DEFAULT_BODY_LIMIT_BYTES;
  return http.createServer(async (req, res) => {
    const method = req.method || "GET";
    const url = new URL(req.url || "/", "http://localhost");
    const pathname = url.pathname;

    if (method === "GET" && pathname === "/health") {
      json(res, 200, { ok: true, service: "hop-verifier-api" });
      return;
    }

    if (method === "POST" && pathname === "/verify/envelope") {
      await handleEnvelopeVerify(req, res, bodyLimitBytes, url.searchParams.get("expectedDigest") || undefined);
      return;
    }

    if (method === "POST" && pathname === "/verify/run") {
      await handleRunVerify(req, res, bodyLimitBytes);
      return;
    }

    json(res, 404, {
      ok: false,
      error: "Route not found.",
      supportedRoutes: ["GET /health", "POST /verify/envelope", "POST /verify/run"]
    });
  });
}

export async function startVerifierApiServer(config: VerifierApiConfig = {}): Promise<http.Server> {
  const host = config.host || process.env.HOP_VERIFY_API_HOST || DEFAULT_HOST;
  const port = config.port || toPositiveNumber(process.env.HOP_VERIFY_API_PORT, DEFAULT_PORT);
  const server = createVerifierApiServer({
    host,
    port,
    bodyLimitBytes: config.bodyLimitBytes || toPositiveNumber(process.env.HOP_VERIFY_API_BODY_LIMIT, DEFAULT_BODY_LIMIT_BYTES)
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
  return server;
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = path.resolve(fileURLToPath(import.meta.url));
if (scriptPath && modulePath === scriptPath) {
  startVerifierApiServer()
    .then((server) => {
      const address = server.address();
      const location =
        typeof address === "object" && address
          ? `http://${address.address}:${address.port}`
          : "unknown";
      console.log(`HopLedger verifier API listening on ${location}`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
