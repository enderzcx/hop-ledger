#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { toEnvelopeFixture, toRunFixture } from "../verify/contracts.js";
import { verifyEnvelopeFixture, verifyRunFixture } from "../verify/run.js";

interface ParsedArgs {
  command?: string;
  flags: Record<string, string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0];
  const flags: Record<string, string> = {};
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const name = token.slice(2).trim();
    if (!name) continue;
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      flags[name] = "true";
      continue;
    }
    flags[name] = value;
    i += 1;
  }
  return { command, flags };
}

function usage(): string {
  return [
    "HopLedger verifier CLI",
    "",
    "Commands:",
    "  verify-envelope --file <path> [--expected-digest <hex>]",
    "  verify-run --file <path>",
    "",
    "Accepted envelope file formats:",
    "  1) Raw AgentRail envelope JSON",
    "  2) Fixture JSON: { name, envelope, expectedDigest }"
  ].join("\n");
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const content = await readFile(absolutePath, "utf8");
  return JSON.parse(content);
}

async function runVerifyEnvelope(flags: Record<string, string>): Promise<number> {
  const file = flags.file;
  if (!file) {
    console.error("Missing --file");
    console.error(usage());
    return 2;
  }

  const json = await readJsonFile(file);
  const fixture = toEnvelopeFixture(json, flags["expected-digest"]);
  const result = verifyEnvelopeFixture(fixture);

  console.log(
    JSON.stringify(
      {
        command: "verify-envelope",
        name: result.name,
        expectedDigest: result.expectedDigest || null,
        actualDigest: result.actualDigest,
        digestMatch: result.digestMatch
      },
      null,
      2
    )
  );

  return result.digestMatch ? 0 : 1;
}

async function runVerifyRun(flags: Record<string, string>): Promise<number> {
  const file = flags.file;
  if (!file) {
    console.error("Missing --file");
    console.error(usage());
    return 2;
  }

  const json = await readJsonFile(file);
  const run = toRunFixture(json);
  const result = verifyRunFixture(run);
  const failedEnvelopes = result.envelopeResults.filter((entry) => !entry.digestMatch);

  console.log(
    JSON.stringify(
      {
        command: "verify-run",
        runDigest: result.runDigest,
        expectedRunDigest: result.expectedRunDigest || null,
        runDigestMatch: result.runDigestMatch,
        envelopeChecks: result.envelopeResults.map((entry) => ({
          name: entry.name,
          expectedDigest: entry.expectedDigest || null,
          actualDigest: entry.actualDigest,
          digestMatch: entry.digestMatch
        })),
        failedEnvelopeCount: failedEnvelopes.length
      },
      null,
      2
    )
  );

  if (!result.runDigestMatch || failedEnvelopes.length > 0) {
    return 1;
  }
  return 0;
}

async function main(): Promise<number> {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (!command) {
    console.error(usage());
    return 2;
  }

  if (command === "verify-envelope") {
    return runVerifyEnvelope(flags);
  }

  if (command === "verify-run") {
    return runVerifyRun(flags);
  }

  console.error(`Unknown command: ${command}`);
  console.error(usage());
  return 2;
}

main()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
