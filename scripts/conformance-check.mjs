import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyEnvelopeFixture, verifyRunFixture } from "../dist/src/verify/run.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function loadJson(relPath) {
  const fullPath = path.resolve(rootDir, relPath);
  const text = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(text);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function boolMark(value) {
  return value ? "PASS" : "FAIL";
}

function run() {
  const envelopeFixture = loadJson("fixtures/contracts/task-envelope.fixture.json");
  const resultFixture = loadJson("fixtures/contracts/task-result.fixture.json");
  const runFixture = loadJson("fixtures/contracts/run.fixture.json");

  const checks = [];

  const envelopeOk = verifyEnvelopeFixture(envelopeFixture).digestMatch;
  checks.push({
    id: "C1",
    name: "task-envelope fixture digest match",
    expected: true,
    actual: envelopeOk,
    pass: envelopeOk === true
  });

  const resultOk = verifyEnvelopeFixture(resultFixture).digestMatch;
  checks.push({
    id: "C2",
    name: "task-result fixture digest match",
    expected: true,
    actual: resultOk,
    pass: resultOk === true
  });

  const runOk = verifyRunFixture(runFixture);
  const runAllPass = runOk.runDigestMatch && runOk.envelopeResults.every((item) => item.digestMatch);
  checks.push({
    id: "C3",
    name: "run fixture digest and steps match",
    expected: true,
    actual: runAllPass,
    pass: runAllPass === true
  });

  const tamperedEnvelopeFixture = clone(envelopeFixture);
  tamperedEnvelopeFixture.envelope.payload.input.symbol = "ETHUSD";
  const tamperedEnvelopeOk = verifyEnvelopeFixture(tamperedEnvelopeFixture).digestMatch;
  checks.push({
    id: "C4",
    name: "tampered envelope must be detected",
    expected: false,
    actual: tamperedEnvelopeOk,
    pass: tamperedEnvelopeOk === false
  });

  const wrongExpectedRunFixture = clone(runFixture);
  wrongExpectedRunFixture.expectedRunDigest = "0".repeat(64);
  const wrongRunExpected = verifyRunFixture(wrongExpectedRunFixture).runDigestMatch;
  checks.push({
    id: "C5",
    name: "wrong run expectedDigest must fail",
    expected: false,
    actual: wrongRunExpected,
    pass: wrongRunExpected === false
  });

  console.log("HopLedger Conformance Matrix");
  console.log("id  | check                                  | expected | actual | status");
  console.log("----+----------------------------------------+----------+--------+-------");
  for (const item of checks) {
    const line =
      `${item.id}`.padEnd(4) +
      "| " +
      `${item.name}`.padEnd(38) +
      `| ${String(item.expected).padEnd(8)} ` +
      `| ${String(item.actual).padEnd(6)} ` +
      `| ${boolMark(item.pass)}`;
    console.log(line);
  }

  const failed = checks.filter((item) => !item.pass);
  if (failed.length > 0) {
    console.error(`Conformance failed: ${failed.length} check(s) did not meet expectation.`);
    process.exit(1);
  }

  console.log("Conformance passed: all checks met expectation.");
}

run();
