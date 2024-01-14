import { performance } from "perf_hooks";
import { World } from "./world";
import { FlowField, flowSpec } from "./flowField";
import { Spec } from "./spec";
import randomSeed from "./randomSeed";
import { makeSeededRng } from "./safeRandom";
import { Currents } from "./currents";

describe("Currents performance", () => {
  it("world.step", () => {
    const start = performance.now();
    const measureSteps = 100;

    // Arbitrary seed for reproducibility
    let seed =
      "0xf3ec9859e53910c4ae52378ee2c7f26fdb498e495f31b91baaae542d08a5cd00";
    const currents = new Currents(seed, 1000, 1000);

    const afterSetup = performance.now();
    const setupTime = afterSetup - start;
    console.log(`Setup time: ${setupTime.toFixed(1)} milliseconds`);

    const initializationSteps =
      50 + currents.spec.numMotes / currents.spec.motesPerStep;
    console.log(`Running ${initializationSteps} initialization steps`);

    for (let i = 0; i < initializationSteps; i++) {
      // Let it fill out and let collisions settle
      currents.step();
    }
    const postInit = performance.now();
    const initializationTime = postInit - setupTime;
    const initializationPerStep = initializationTime / initializationSteps;
    console.log(
      `Initialization took: ${initializationPerStep.toFixed(1)} ms/step`
    );

    for (let i = 0; i < measureSteps; i++) {
      currents.step();
    }

    const end = performance.now();

    const duration = end - postInit;
    const perStep = duration / measureSteps;
    console.log(`Steps took ${perStep.toFixed(1)} milliseconds each`);
  });
});
