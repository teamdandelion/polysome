import { performance } from "perf_hooks";
import { World } from "./world";
import { FlowField, flowSpec } from "./flowField";
import { Spec } from "./spec";
import randomSeed from "./randomSeed";
import { makeSeededRng } from "./safeRandom";

describe("world performance", () => {
  it("world.step", () => {
    const start = performance.now();
    const nSteps = 40;

    // Arbitrary seed for reproducibility
    let seed =
      "0xf3ec9859e53910c4ae52378ee2c7f26fdb498e495f31b91baaae542d08a5cd00";
    const rng = makeSeededRng(seed);
    const spec = new Spec();
    spec.numMotes = 10000;
    const ff = new FlowField(flowSpec(rng, spec));
    const world = new World(spec, rng, ff);

    const mid = performance.now();
    const setupTime = mid - start;
    console.log(`Setup time: ${setupTime.toFixed(1)} milliseconds`);

    for (let i = 0; i < nSteps; i++) {
      world.step();
    }

    const end = performance.now();

    const duration = end - mid;
    const perStep = duration / nSteps;
    console.log(`Steps took ${perStep.toFixed(1)} milliseconds each`);
  });
});
