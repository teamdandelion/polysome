import assert from "node:assert/strict";
import test from "node:test";

import {
  HELLO_WORLD_NOTEBOOK,
  NOTEBOOKS,
  findNotebook,
} from "../demo/src/notebooks/helloWorld.ts";
import {
  calculateCompactTankHeight,
  calculateTankWindow,
} from "../demo/src/notebooks/tankGeometry.ts";

test("the hello-world notebook is a current-build recipe", () => {
  assert.deepEqual(NOTEBOOKS, [HELLO_WORLD_NOTEBOOK]);
  assert.equal(findNotebook("hello-world"), HELLO_WORLD_NOTEBOOK);
  assert.deepEqual(HELLO_WORLD_NOTEBOOK.simulation, {});
  assert.ok(HELLO_WORLD_NOTEBOOK.seed.startsWith("0x"));
  assert.throws(() => findNotebook("missing"), /Unknown notebook/);
});

test("the aquarium shrinks one-for-one into the viewport's top third", () => {
  const expanded = 630;
  const stickyTop = 69;
  const compact = calculateCompactTankHeight(852, stickyTop, expanded);

  assert.equal(compact, 215);
  assert.equal(calculateCompactTankHeight(631, stickyTop, 517.4140625), 144);

  assert.deepEqual(calculateTankWindow(100, stickyTop, expanded, compact), {
    collapse: 0,
    height: 630,
    phase: "expanded",
  });
  assert.deepEqual(calculateTankWindow(-31, stickyTop, expanded, compact), {
    collapse: 100,
    height: 530,
    phase: "shrinking",
  });
  assert.deepEqual(calculateTankWindow(-346, stickyTop, expanded, compact), {
    collapse: 415,
    height: 215,
    phase: "compact",
  });
});

test("invalid aquarium geometry is rejected", () => {
  assert.throws(() => calculateTankWindow(0, 0, 100, 0), /compact height/);
  assert.throws(
    () => calculateCompactTankHeight(0, 0, 100),
    /positive viewport/,
  );
});
