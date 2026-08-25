// Core API
export { Instance, type InstanceOptions } from "./instance.ts";
export { SimulationParams } from "./simulationParams.ts";
export { RenderParams } from "./renderParams.ts";

// Types
export type { ColorPoint } from "./colorInterpolationSystem.ts";
export type { PerfMap } from "./perfBuffer.ts";
export type {
  PerformanceSample,
  SimulationPerformance,
} from "./performance.ts";

// Vector utilities
export { Vector } from "./vector.ts";

// Random number generation
export { randomSeed, makeSeededRng, type Rng } from "./random.ts";

// Rendering context (if users want custom rendering)
export { RenderContext } from "./renderContext.ts";

// Color utilities
export { hsbToRgb } from "./colorUtils.ts";
