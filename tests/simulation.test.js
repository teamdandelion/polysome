import assert from "node:assert/strict";
import test from "node:test";

import { MoteSimulator } from "../src/moteSimulator.ts";
import { Simulation } from "../src/simulation.ts";
import { SimulationParams } from "../src/simulationParams.ts";

const SEED =
  "0x1b50318e0b301eab6c7147d253268b6a06cdb98920792de015b8927cdd44087a";
const OVERRIDES = { numMotes: 128, numDisturbances: 5 };

function assertSameState(actual, expected) {
  assert.equal(actual.step, expected.step);
  assert.deepEqual(actual.moteX, expected.moteX);
  assert.deepEqual(actual.moteY, expected.moteY);
  assert.deepEqual(actual.motePressure, expected.motePressure);
}

test("the notebook adapter follows the existing mote simulator", () => {
  const simulation = new Simulation(SEED, 320, 500, {
    simulation: OVERRIDES,
  });
  const parameters = Object.assign(new SimulationParams(), OVERRIDES);
  const direct = new MoteSimulator(parameters, SEED, 320, 500);

  simulation.advance(40);
  for (let step = 0; step < 40; step++) direct.step(false);

  assertSameState(simulation.view(), {
    step: direct.stepCounter,
    moteX: direct.moteX,
    moteY: direct.moteY,
    motePressure: direct.motePressure,
  });
});

test("advance(n) is equivalent to n individual steps", () => {
  const batched = new Simulation(SEED, 320, 500, {
    simulation: OVERRIDES,
  });
  const individual = new Simulation(SEED, 320, 500, {
    simulation: OVERRIDES,
  });

  batched.advance(30);
  for (let step = 0; step < 30; step++) individual.step();

  assertSameState(batched.view(), individual.view());
});

test("a current-build view has the requested shape and finite positions", () => {
  const simulation = new Simulation(SEED, 320, 500, {
    simulation: OVERRIDES,
  });
  simulation.advance(10);
  const view = simulation.view();

  assert.equal(view.step, 10);
  assert.equal(view.width, 320);
  assert.equal(view.height, 500);
  assert.equal(view.moteX.length, OVERRIDES.numMotes);
  assert.equal(view.moteY.length, OVERRIDES.numMotes);
  assert.equal(view.motePressure.length, OVERRIDES.numMotes);
  assert.ok(Array.from(view.moteX).every(Number.isFinite));
  assert.ok(Array.from(view.moteY).every(Number.isFinite));

  assert.throws(() => simulation.advance(-1), /non-negative integer/);
  assert.throws(() => simulation.advance(0.5), /non-negative integer/);
  simulation.advance(0);
  assert.equal(simulation.view().step, 10);
});
