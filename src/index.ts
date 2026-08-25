// Core API
export { Instance, type InstanceOptions } from "./instance.ts";
export {
  Simulation,
  SIMULATION_DYNAMICS_VERSION,
  SIMULATION_CHECKPOINT_SCHEMA,
  type SimulationCheckpoint,
  type SimulationOptions,
  type SimulationView,
} from "./simulation.ts";
export { SimulationParams } from "./simulationParams.ts";
export { RenderParams } from "./renderParams.ts";

// Types
export type { ColorPoint } from "./colorInterpolationSystem.ts";
export type { PerfMap } from "./perfBuffer.ts";
export type {
  PerformanceSample,
  SimulationPerformance,
} from "./performance.ts";
export {
  MORPHOLOGY_METRIC_VERSION,
  measureMorphology,
  type DenseComponentMetric,
  type GridMorphologyMetric,
  type MorphologyFingerprint,
  type MorphologyInput,
  type MorphologyOptions,
} from "./morphology.ts";
export {
  SCIENCE_COMPARISONS,
  SCIENCE_EXHIBITS,
  SCIENCE_EXHIBIT_SCHEMA,
  evaluateScienceExhibit,
  findScienceExhibit,
  formatScienceMetric,
  readScienceMetric,
  type ScienceComparison,
  type ScienceExhibit,
  type ScienceExhibitDynamics,
  type ScienceExhibitExpectation,
  type ScienceExpectationResult,
  type ScienceMetricKey,
} from "./scienceExhibits.ts";

// Vector utilities
export { Vector } from "./vector.ts";

// Random number generation
export {
  randomSeed,
  makeSeededRng,
  type Rng,
  type RngState,
} from "./random.ts";

// Rendering context (if users want custom rendering)
export { RenderContext } from "./renderContext.ts";

// Color utilities
export { hsbToRgb } from "./colorUtils.ts";
