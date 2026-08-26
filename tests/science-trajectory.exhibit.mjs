import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { measureMorphology } from "../src/morphology.ts";
import { SCIENCE_EXHIBITS } from "../src/scienceExhibits.ts";
import { Simulation } from "../src/simulation.ts";

const BASELINE_RUN_ID =
  "940a8f54de54fa255e360295960b434418533f608cdf3fd886e152a379930995";
const MANIFEST_URL = new URL(
  "../experiments/current-portrait-baseline.json",
  import.meta.url,
);
const RESULT_URL = new URL(
  "../experiments/results/current-portrait-baseline.json",
  import.meta.url,
);

const manifest = JSON.parse(readFileSync(MANIFEST_URL, "utf8"));
const baseline = JSON.parse(readFileSync(RESULT_URL, "utf8"));
const reference = SCIENCE_EXHIBITS.find(({ id }) => id === "self-organization");

function interactionGrid(morphology) {
  const grid = morphology.grids.find(
    ({ cellSizeToMoteRadius }) => cellSizeToMoteRadius === 1,
  );
  assert.ok(
    grid,
    `step ${morphology.step} is missing its interaction-scale grid`,
  );
  return grid;
}

function denseMassAtTwiceMean(grid) {
  const component = grid.denseComponents.find(
    ({ thresholdToMean }) => thresholdToMean === 2,
  );
  assert.ok(
    component,
    "interaction-scale grid is missing its 2x dense threshold",
  );
  return component.largestMassFraction;
}

function assertNear(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} differs from the registered ${expected} by more than ${tolerance}`,
  );
}

test("the reference trajectory fixture matches the registered baseline artifact", () => {
  assert.ok(reference, "science exhibit registry is missing self-organization");
  assert.equal(manifest.schema, "polysome.experiment/v1");
  assert.equal(manifest.label, "current-portrait-baseline");
  assert.equal(baseline.schema, "polysome.experiment-result/v1");
  assert.equal(baseline.label, manifest.label);
  assert.equal(baseline.runId, BASELINE_RUN_ID);
  assert.deepEqual(baseline.execution, {
    complete: true,
    finalMeasurementStep: 9000,
    untilStep: 9000,
  });

  const { label: _label, ...manifestDefinition } = manifest;
  assert.deepEqual(baseline.definition, manifestDefinition);
  assert.deepEqual(
    baseline.measurements.map(({ step }) => step),
    manifest.measurements.atSteps,
  );
  assert.ok(
    baseline.measurements.every(
      ({ morphology }) =>
        morphology.schemaVersion === 1 &&
        morphology.metricVersion === "polysome-morphology-v1",
    ),
    "every committed checkpoint must use morphology metric v1",
  );
  assert.deepEqual(baseline.provenance, {
    gitCommit: "1f9659e156c37e89eea15a2c373c331cb68b26c2",
    packageName: "@teamdandelion/polysome",
    packageVersion: "1.1.0",
  });

  assert.equal(reference.schema, "polysome.science-exhibit/v1");
  assert.equal(reference.revision, 1);
  assert.equal(reference.dynamicsVersion, manifest.dynamicsVersion);
  assert.equal(reference.metricVersion, "polysome-morphology-v1");
  assert.equal(reference.seed, manifest.seed);
  assert.equal(reference.width, manifest.bounds.width);
  assert.equal(reference.height, manifest.bounds.height);
  assert.deepEqual(reference.parameters, manifest.parameters);
  assert.ok(manifest.measurements.atSteps.includes(reference.measurementStep));
});

test("the canonical trajectory retains its registered regression fingerprint", () => {
  assert.ok(reference, "science exhibit registry is missing self-organization");

  const simulation = new Simulation(
    reference.seed,
    reference.width,
    reference.height,
    { parameters: reference.parameters },
  );
  const observations = [];
  let previousStep = 0;

  for (const step of manifest.measurements.atSteps) {
    simulation.advance(step - previousStep);
    previousStep = step;
    const morphology = measureMorphology(simulation.view());
    const registered = baseline.measurements.find(
      (measurement) => measurement.step === step,
    );
    assert.ok(registered, `baseline artifact is missing step ${step}`);

    const grid = interactionGrid(morphology);
    const registeredGrid = interactionGrid(registered.morphology);
    const contactRatio = morphology.contacts.nominalUniformContactRatio;
    assert.notEqual(contactRatio, null);

    // These deliberately broad envelopes detect trajectory drift without
    // making the exhibit depend on bit-identical floating-point arithmetic.
    assertNear(
      contactRatio,
      registered.morphology.contacts.nominalUniformContactRatio,
      0.08,
      `step ${step} contact ratio`,
    );
    assertNear(
      grid.emptyCellFraction,
      registeredGrid.emptyCellFraction,
      0.03,
      `step ${step} empty-cell fraction`,
    );
    assertNear(
      grid.emptyVoids.largestCellFraction,
      registeredGrid.emptyVoids.largestCellFraction,
      0.03,
      `step ${step} largest void`,
    );
    assertNear(
      denseMassAtTwiceMean(grid),
      denseMassAtTwiceMean(registeredGrid),
      0.04,
      `step ${step} dense-core mass`,
    );

    observations.push({
      step,
      contactRatio,
      emptyFraction: grid.emptyCellFraction,
      largestVoid: grid.emptyVoids.largestCellFraction,
      denseCoreMass: denseMassAtTwiceMean(grid),
      pressureMax: morphology.pressure.max,
      pressureAtCeiling: morphology.pressure.fractionAt255,
    });
  }

  const at = (step) => {
    const observation = observations.find((sample) => sample.step === step);
    assert.ok(observation, `trajectory is missing step ${step}`);
    return observation;
  };

  // The seeded initialization is close to the nominal uniform contact model,
  // with no interaction-scale void or 2x-density core already planted in it.
  assert.ok(at(1).contactRatio > 0.85 && at(1).contactRatio < 1.1);
  assert.ok(at(1).emptyFraction < 0.02);
  assert.ok(at(1).denseCoreMass < 0.02);

  // Structure emerges by step 300: contacts are enriched, a substantial part
  // of the grid is empty, and most empty cells belong to one connected void.
  assert.ok(at(300).contactRatio > at(1).contactRatio + 0.6);
  assert.ok(at(300).emptyFraction > 0.12);
  assert.ok(at(300).largestVoid > 0.1);
  assert.ok(at(300).largestVoid / at(300).emptyFraction > 0.7);
  assert.ok(at(300).denseCoreMass > 0.07);

  // Contact enrichment persists in the mature trajectory rather than being a
  // transient spike at the first measurement of visible organization.
  for (const step of [1800, 3600, 9000]) {
    assert.ok(
      at(step).contactRatio > 1.9,
      `step ${step} lost mature enrichment`,
    );
  }

  // The void opens, contracts, and reopens while dense mass falls and then
  // consolidates. This preserves a useful regression fingerprint without
  // treating one trajectory as a general scientific conclusion.
  assert.ok(at(900).emptyFraction > at(300).emptyFraction);
  assert.ok(at(1800).emptyFraction < at(900).emptyFraction - 0.07);
  assert.ok(at(3600).emptyFraction > at(1800).emptyFraction + 0.02);
  assert.ok(at(300).denseCoreMass > at(150).denseCoreMass + 0.03);
  assert.ok(at(900).denseCoreMass < at(300).denseCoreMass - 0.02);
  assert.ok(at(1800).denseCoreMass > at(900).denseCoreMass + 0.2);
  assert.ok(at(1800).denseCoreMass > 0.25);

  // A Uint8 pressure ceiling would invalidate neighbor-derived morphology.
  assert.ok(
    observations.every(
      ({ pressureMax, pressureAtCeiling }) =>
        pressureMax < 255 && pressureAtCeiling === 0,
    ),
    "the reference trajectory reached the 8-bit pressure ceiling",
  );
});
