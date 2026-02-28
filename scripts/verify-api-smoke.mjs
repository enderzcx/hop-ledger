import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

const host = "127.0.0.1";
const port = Number(process.env.HOP_VERIFY_SMOKE_PORT || 4421);
const baseUrl = `http://${host}:${port}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForHealthy(maxAttempts = 40) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`status=${response.status}`);
      }
      const body = await response.json();
      if (body && body.ok === true) {
        return;
      }
      throw new Error("invalid health payload");
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`verifier api did not become healthy at ${baseUrl}`);
}

async function postJson(route, payload) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function main() {
  const server = spawn("node", ["dist/src/api/verifier.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOP_VERIFY_API_HOST: host,
      HOP_VERIFY_API_PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let serverExited = false;
  server.on("exit", () => {
    serverExited = true;
  });

  server.stdout.on("data", (chunk) => {
    process.stdout.write(`[verify-api] ${chunk}`);
  });
  server.stderr.on("data", (chunk) => {
    process.stderr.write(`[verify-api] ${chunk}`);
  });

  try {
    await waitForHealthy();
    assert(!serverExited, "verifier api exited before smoke checks");

    const runFixture = JSON.parse(
      await readFile("fixtures/contracts/run.fixture.json", "utf8")
    );
    const runResult = await postJson("/verify/run", runFixture);
    assert(runResult.status === 200, `verify-run http status expected 200, got ${runResult.status}`);
    assert(runResult.body.ok === true, "verify-run response ok must be true");
    assert(runResult.body.verificationPassed === true, "verify-run verificationPassed must be true");
    assert(runResult.body.runDigestMatch === true, "verify-run runDigestMatch must be true");

    const envelopeFixture = JSON.parse(
      await readFile("fixtures/contracts/task-envelope.fixture.json", "utf8")
    );
    const envelopeResult = await postJson("/verify/envelope", envelopeFixture);
    assert(
      envelopeResult.status === 200,
      `verify-envelope http status expected 200, got ${envelopeResult.status}`
    );
    assert(envelopeResult.body.ok === true, "verify-envelope response ok must be true");
    assert(
      envelopeResult.body.verificationPassed === true,
      "verify-envelope verificationPassed must be true"
    );
    assert(envelopeResult.body.digestMatch === true, "verify-envelope digestMatch must be true");

    console.log(
      JSON.stringify(
        {
          smoke: "verify-api",
          status: "passed",
          baseUrl
        },
        null,
        2
      )
    );
  } finally {
    server.kill("SIGTERM");
    await sleep(200);
    if (!serverExited) {
      server.kill("SIGKILL");
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
