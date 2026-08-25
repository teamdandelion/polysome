import assert from "node:assert/strict";
import test from "node:test";

import {
  SIMULATION_CHECKPOINT_SCHEMA,
  SIMULATION_DYNAMICS_VERSION,
  Simulation,
} from "../src/simulation.ts";

const SEED =
  "0x1b50318e0b301eab6c7147d253268b6a06cdb98920792de015b8927cdd44087a";

function assertSameView(actual, expected) {
  assert.equal(actual.dynamicsVersion, expected.dynamicsVersion);
  assert.equal(actual.step, expected.step);
  assert.equal(actual.width, expected.width);
  assert.equal(actual.height, expected.height);
  assert.equal(actual.moteRadius, expected.moteRadius);
  assert.equal(actual.collisionPairs, expected.collisionPairs);
  assert.equal(actual.reinjections, expected.reinjections);
  assert.equal(actual.totalReinjections, expected.totalReinjections);
  assert.deepEqual(actual.moteX, expected.moteX);
  assert.deepEqual(actual.moteY, expected.moteY);
  assert.deepEqual(actual.motePressure, expected.motePressure);
}

test("advance(n) is identical to n individual steps", () => {
  const parameters = { numMotes: 256, numDisturbances: 7 };
  const batched = new Simulation(SEED, 320, 500, { parameters });
  const individual = new Simulation(SEED, 320, 500, { parameters });

  batched.advance(80);
  for (let step = 0; step < 80; step++) individual.step();

  assertSameView(batched.view(), individual.view());
});

test("checkpoint and restore produce the same continuation", () => {
  const parameters = { numMotes: 256, numDisturbances: 7 };
  const direct = new Simulation(SEED, 320, 500, { parameters });
  direct.advance(120);

  const split = new Simulation(SEED, 320, 500, { parameters });
  split.advance(45);
  const checkpoint = split.checkpoint();

  assert.equal(checkpoint.schema, SIMULATION_CHECKPOINT_SCHEMA);
  assert.equal(checkpoint.dynamicsVersion, SIMULATION_DYNAMICS_VERSION);

  const restored = Simulation.fromCheckpoint(checkpoint);
  restored.advance(75);
  assertSameView(restored.view(), direct.view());
  assert.deepEqual(
    restored.checkpoint().state.flowField,
    direct.checkpoint().state.flowField,
  );
  assert.deepEqual(
    restored.checkpoint().state.rng,
    direct.checkpoint().state.rng,
  );
});

test("legacy portrait baseline retains its known collision trajectory", () => {
  const simulation = new Simulation(SEED, 622.82, 1000);

  simulation.advance(1);
  assert.equal(simulation.view().collisionPairs, 74_915);

  simulation.advance(99);
  assert.equal(simulation.view().collisionPairs, 105_677);

  simulation.advance(200);
  assert.equal(simulation.view().collisionPairs, 138_745);
});

test("advance validates its exact step count", () => {
  const simulation = new Simulation(SEED, 100, 100, {
    parameters: { numMotes: 10 },
  });

  assert.throws(() => simulation.advance(-1), /non-negative integer/);
  assert.throws(() => simulation.advance(0.5), /non-negative integer/);
  simulation.advance(0);
  assert.equal(simulation.view().step, 0);
});
