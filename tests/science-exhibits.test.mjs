import assert from "node:assert/strict";
import test from "node:test";

import { measureMorphology } from "../src/morphology.ts";
import {
  SCIENCE_COMPARISONS,
  SCIENCE_EXHIBITS,
  evaluateScienceExhibit,
  readScienceMetric,
} from "../src/scienceExhibits.ts";
import { Simulation } from "../src/simulation.ts";
import { SimulationParams } from "../src/simulationParams.ts";

test("science exhibit registry is complete and has stable unique anchors", () => {
  const ids = SCIENCE_EXHIBITS.map(({ id }) => id);
  assert.deepEqual(ids, [
    "self-organization",
    "without-soft-wall",
    "without-repulsion",
  ]);
  assert.equal(new Set(ids).size, ids.length);

  const parameterKeys = Object.keys(new SimulationParams()).sort();
  const reference = SCIENCE_EXHIBITS[0];
  assert.equal(
    reference.referenceRunId,
    "940a8f54de54fa255e360295960b434418533f608cdf3fd886e152a379930995",
  );
  for (const exhibit of SCIENCE_EXHIBITS) {
    assert.match(exhibit.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(exhibit.schema, "polysome.science-exhibit/v1");
    assert.equal(exhibit.revision, 1);
    assert.ok(
      exhibit.evidenceLevel === "reference-trajectory" ||
        exhibit.evidenceLevel === "paired-seed",
    );
    assert.equal(exhibit.dynamicsVersion, "legacy-v1");
    assert.equal(exhibit.metricVersion, "polysome-morphology-v1");
    assert.deepEqual(Object.keys(exhibit.parameters).sort(), parameterKeys);
    assert.equal(exhibit.seed, reference.seed);
    assert.equal(exhibit.width, reference.width);
    assert.equal(exhibit.height, reference.height);
    const actualChanges = parameterKeys.filter(
      (key) => exhibit.parameters[key] !== reference.parameters[key],
    );
    assert.deepEqual(actualChanges, [...exhibit.changedParameters].sort());
    assert.ok(Number.isSafeInteger(exhibit.measurementStep));
    assert.ok(exhibit.measurementStep > 0);
    assert.ok(
      exhibit.liveStopStep === undefined ||
        exhibit.liveStopStep >= exhibit.measurementStep,
    );
    assert.ok(exhibit.expectations.length > 0);
    assert.equal(
      new Set(exhibit.expectations.map(({ metric }) => metric)).size,
      exhibit.expectations.length,
    );
    for (const expectation of exhibit.expectations) {
      assert.ok(
        expectation.minimum === undefined ||
          expectation.maximum === undefined ||
          expectation.minimum <= expectation.maximum,
      );
    }
  }

  for (const comparison of SCIENCE_COMPARISONS) {
    assert.ok(ids.includes(comparison.leftExhibitId));
    assert.ok(ids.includes(comparison.rightExhibitId));
    assert.notEqual(comparison.leftExhibitId, comparison.rightExhibitId);
  }
});

test("every registered science specimen reproduces its contract", () => {
  const observations = new Map();

  const observe = (exhibit, step) => {
    const key = `${exhibit.id}:${step}`;
    const cached = observations.get(key);
    if (cached) return cached;

    const simulation = new Simulation(
      exhibit.seed,
      exhibit.width,
      exhibit.height,
      { parameters: exhibit.parameters },
    );
    simulation.advance(step);
    const view = simulation.view();
    const observation = { morphology: measureMorphology(view), dynamics: view };
    observations.set(key, observation);
    return observation;
  };

  for (const exhibit of SCIENCE_EXHIBITS) {
    const observation = observe(exhibit, exhibit.measurementStep);
    const results = evaluateScienceExhibit(
      exhibit,
      observation.morphology,
      observation.dynamics,
    );

    for (const result of results) {
      assert.equal(
        result.passed,
        true,
        `${exhibit.id}: ${result.metric} was ${result.actual}; expected ${result.minimum ?? "−∞"}..${result.maximum ?? "+∞"}`,
      );
    }

    if (exhibit.liveStopStep !== undefined) {
      const finalLiveObservation = observe(exhibit, exhibit.liveStopStep);
      assert.ok(
        finalLiveObservation.morphology.pressure.max < 255,
        `${exhibit.id}: live stop enters the legacy Uint8 pressure ceiling`,
      );
      assert.equal(
        finalLiveObservation.morphology.pressure.fractionAt255,
        0,
        `${exhibit.id}: live stop includes saturated stored pressure`,
      );
    }
  }

  for (const comparison of SCIENCE_COMPARISONS) {
    const leftExhibit = SCIENCE_EXHIBITS.find(
      ({ id }) => id === comparison.leftExhibitId,
    );
    const rightExhibit = SCIENCE_EXHIBITS.find(
      ({ id }) => id === comparison.rightExhibitId,
    );
    assert.ok(
      leftExhibit,
      `Missing comparison subject ${comparison.leftExhibitId}`,
    );
    assert.ok(
      rightExhibit,
      `Missing comparison subject ${comparison.rightExhibitId}`,
    );
    const left = observe(leftExhibit, comparison.step);
    const right = observe(rightExhibit, comparison.step);
    const leftValue = readScienceMetric(
      comparison.metric,
      left.morphology,
      left.dynamics,
    );
    const rightValue = readScienceMetric(
      comparison.metric,
      right.morphology,
      right.dynamics,
    );

    if (comparison.relation === "greaterBy") {
      assert.ok(
        leftValue - rightValue >= comparison.threshold,
        `${comparison.label}: ${leftValue} - ${rightValue} < ${comparison.threshold}`,
      );
    } else {
      assert.ok(
        rightValue > 0 && leftValue / rightValue >= comparison.threshold,
        `${comparison.label}: ${leftValue} / ${rightValue} < ${comparison.threshold}`,
      );
    }
  }
});
