// Core API
export { Instance } from "./instance.ts";
export { Spec } from "./spec.ts";

// Types
export type { ColorPoint } from "./colorInterpolationSystem.ts";
export type { PerfMap } from "./perfBuffer.ts";

// Vector utilities
export { Vector } from "./vector.ts";

// Random number generation
export { makeSeededRng, type Rng } from "./safeRandom.ts";
export { default as randomSeed } from "./randomSeed.ts";

// Rendering context (if users want custom rendering)
export { RenderContext } from "./renderContext.ts";

// Color utilities
export { hsbToRgb } from "./colorUtils.ts";
