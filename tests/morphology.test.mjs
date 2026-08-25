import assert from "node:assert/strict";
import test from "node:test";

import { measureMorphology } from "../src/morphology.ts";

function makeInput(overrides = {}) {
  return {
    step: 12,
    width: 100,
    height: 100,
    moteRadius: 20,
    moteX: new Float32Array(),
    moteY: new Float32Array(),
    motePressure: new Uint8Array(),
    collisionPairs: 0,
    ...overrides,
  };
}

test("distinguishes a uniform occupancy field from a concentrated cluster", () => {
  const uniformX = new Float32Array(100);
  const uniformY = new Float32Array(100);
  let index = 0;
  for (let row = 0; row < 10; row++) {
    for (let column = 0; column < 10; column++) {
      uniformX[index] = column * 10 + 5;
      uniformY[index] = row * 10 + 5;
      index++;
    }
  }

  const uniform = measureMorphology(
    makeInput({
      moteX: uniformX,
      moteY: uniformY,
      motePressure: new Uint8Array(100),
    }),
  );
  const clustered = measureMorphology(
    makeInput({
      moteX: new Float32Array(100).fill(5),
      moteY: new Float32Array(100).fill(5),
      motePressure: new Uint8Array(100).fill(99),
      collisionPairs: 4_950,
    }),
  );

  const uniformFineGrid = uniform.grids[0];
  const clusteredFineGrid = clustered.grids[0];
  assert.equal(uniformFineGrid.columns, 10);
  assert.equal(uniformFineGrid.rows, 10);
  assert.equal(uniformFineGrid.densityCoefficientOfVariation, 0);
  assert.equal(uniformFineGrid.emptyCellFraction, 0);
  assert.ok(Math.abs(uniformFineGrid.normalizedShannonEntropy - 1) < 1e-14);
  assert.equal(uniformFineGrid.maximumToMeanDensity, 1);

  assert.ok(clusteredFineGrid.densityCoefficientOfVariation > 9);
  assert.equal(clusteredFineGrid.emptyCellFraction, 0.99);
  assert.equal(clusteredFineGrid.normalizedShannonEntropy, 0);
  assert.equal(clusteredFineGrid.maximumToMeanDensity, 100);
  assert.equal(clusteredFineGrid.emptyVoids.componentCount, 1);
  assert.equal(clusteredFineGrid.emptyVoids.largestCellFraction, 0.99);

  assert.equal(clustered.contacts.collisionPairs, 4_950);
  assert.equal(clustered.contacts.meanContactsPerMote, 99);
  assert.equal(clustered.pressure.mean, 99);
  assert.equal(clustered.geometry.radiusOfGyration, 0);
  assert.equal(clustered.geometry.covariance.anisotropy, 0);
});

test("reports authoritative contacts, pressure quantiles, and global shape", () => {
  const fingerprint = measureMorphology(
    makeInput({
      moteRadius: 10,
      moteX: new Float32Array([0, 2, 4, 6]),
      moteY: new Float32Array([10, 10, 10, 10]),
      motePressure: new Uint8Array([0, 1, 2, 255]),
      collisionPairs: 3,
    }),
  );

  assert.equal(fingerprint.schemaVersion, 1);
  assert.equal(fingerprint.metricVersion, "polysome-morphology-v1");
  assert.equal(fingerprint.contacts.meanContactsPerMote, 1.5);
  assert.ok(
    Math.abs(fingerprint.contacts.nominalUniformMeanContacts - 0.03 * Math.PI) <
      1e-15,
  );
  assert.ok(fingerprint.contacts.nominalUniformContactRatio > 15);
  assert.deepEqual(fingerprint.pressure, {
    mean: 64.5,
    p50: 1,
    p95: 255,
    p99: 255,
    max: 255,
    fractionAt255: 0.25,
  });
  assert.deepEqual(fingerprint.geometry.centroid, { x: 3, y: 10 });
  assert.ok(
    Math.abs(fingerprint.geometry.radiusOfGyration - Math.sqrt(5)) < 1e-15,
  );
  assert.equal(fingerprint.geometry.covariance.majorEigenvalue, 5);
  assert.equal(fingerprint.geometry.covariance.minorEigenvalue, 0);
  assert.equal(fingerprint.geometry.covariance.anisotropy, 1);
});

test("is deterministic, does not mutate state, and clamps escaped motes to edge bins", () => {
  const input = makeInput({
    moteRadius: 200,
    moteX: new Float32Array([-5, 105]),
    moteY: new Float32Array([-10, 110]),
    motePressure: new Uint8Array([3, 7]),
    collisionPairs: 1,
  });
  const beforeX = Array.from(input.moteX);
  const beforeY = Array.from(input.moteY);
  const beforePressure = Array.from(input.motePressure);

  const first = measureMorphology(input, {
    gridCellSizeMultipliers: [0.25],
    denseThresholdMultipliers: [1, 2],
  });
  const second = measureMorphology(input, {
    gridCellSizeMultipliers: [0.25],
    denseThresholdMultipliers: [1, 2],
  });

  assert.deepEqual(second, first);
  assert.deepEqual(Array.from(input.moteX), beforeX);
  assert.deepEqual(Array.from(input.moteY), beforeY);
  assert.deepEqual(Array.from(input.motePressure), beforePressure);

  const grid = first.grids[0];
  assert.equal(grid.columns, 2);
  assert.equal(grid.rows, 2);
  assert.equal(grid.emptyCellFraction, 0.5);
  assert.equal(grid.maximumToMeanDensity, 2);
  // Diagonally adjacent cells are one component under the documented 8-neighbor rule.
  assert.equal(grid.denseComponents[0].componentCount, 1);
  assert.equal(grid.denseComponents[0].largestCellFraction, 0.5);
  assert.equal(grid.denseComponents[0].largestMassFraction, 1);
});

test("defines zero- and one-mote fingerprints without non-finite JSON values", () => {
  const empty = measureMorphology(makeInput());
  assert.equal(empty.moteCount, 0);
  assert.equal(empty.contacts.meanContactsPerMote, 0);
  assert.equal(empty.contacts.nominalUniformContactRatio, null);
  assert.deepEqual(empty.pressure, {
    mean: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    max: 0,
    fractionAt255: 0,
  });
  assert.deepEqual(empty.geometry, {
    centroid: null,
    radiusOfGyration: null,
    covariance: null,
  });
  assert.equal(empty.grids[0].emptyVoids.componentCount, 1);
  assert.equal(empty.grids[0].emptyVoids.largestCellFraction, 1);
  assert.doesNotMatch(JSON.stringify(empty), /NaN|Infinity/);

  const singleton = measureMorphology(
    makeInput({
      moteX: new Float32Array([2]),
      moteY: new Float32Array([3]),
      motePressure: new Uint8Array([0]),
    }),
  );
  assert.deepEqual(singleton.geometry.centroid, { x: 2, y: 3 });
  assert.equal(singleton.geometry.radiusOfGyration, 0);
  assert.equal(singleton.geometry.covariance.anisotropy, 0);
  assert.equal(singleton.contacts.nominalUniformContactRatio, null);
});

test("rejects degenerate domains, malformed state, and invalid options", () => {
  assert.throws(
    () => measureMorphology(makeInput({ width: 0 })),
    /width must be a positive finite number/,
  );
  assert.throws(
    () => measureMorphology(makeInput({ moteRadius: Number.NaN })),
    /moteRadius must be a positive finite number/,
  );
  assert.throws(
    () =>
      measureMorphology(
        makeInput({
          moteX: new Float32Array([1]),
          moteY: new Float32Array(),
          motePressure: new Uint8Array([0]),
        }),
      ),
    /must have identical lengths/,
  );
  assert.throws(
    () =>
      measureMorphology(
        makeInput({
          moteX: new Float32Array([Number.NaN]),
          moteY: new Float32Array([0]),
          motePressure: new Uint8Array([0]),
        }),
      ),
    /position at index 0 must be finite/,
  );
  assert.throws(
    () =>
      measureMorphology(
        makeInput({
          moteX: new Float32Array([0]),
          moteY: new Float32Array([0]),
          motePressure: new Uint8Array([0]),
          collisionPairs: 1,
        }),
      ),
    /cannot exceed the number of unique mote pairs/,
  );
  assert.throws(
    () => measureMorphology(makeInput(), { gridCellSizeMultipliers: [] }),
    /must contain at least one value/,
  );
  assert.throws(
    () =>
      measureMorphology(makeInput(), {
        denseThresholdMultipliers: [1, -1],
      }),
    /denseThresholdMultipliers\[1\] must be a positive finite number/,
  );
});
