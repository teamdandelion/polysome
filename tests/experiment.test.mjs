import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const BASELINE_RUN_ID =
  "940a8f54de54fa255e360295960b434418533f608cdf3fd886e152a379930995";

function runSmokeExperiment() {
  return execFileSync(
    process.execPath,
    ["tools/run-experiment.mjs", "--until", "1"],
    { cwd: REPOSITORY_ROOT, encoding: "utf8" },
  );
}

test("baseline manifest has a stable identity and deterministic first measurement", () => {
  const firstOutput = runSmokeExperiment();
  const secondOutput = runSmokeExperiment();
  assert.equal(secondOutput, firstOutput);

  const result = JSON.parse(firstOutput);
  assert.equal(result.schema, "polysome.experiment-result/v1");
  assert.equal(result.runId, BASELINE_RUN_ID);
  assert.deepEqual(result.execution, {
    complete: false,
    finalMeasurementStep: 9000,
    untilStep: 1,
  });
  assert.equal(result.measurements.length, 1);
  assert.equal(result.measurements[0].step, 1);
  assert.equal(
    result.measurements[0].morphology.contacts.collisionPairs,
    74_915,
  );
  assert.deepEqual(result.measurements[0].dynamics, {
    reinjections: 0,
    totalReinjections: 0,
  });
});
