import {
  MORPHOLOGY_METRIC_VERSION,
  type MorphologyFingerprint,
} from "./morphology.ts";
import { SIMULATION_DYNAMICS_VERSION } from "./simulation.ts";
import type { SimulationParams } from "./simulationParams.ts";

export const SCIENCE_EXHIBIT_SCHEMA = "polysome.science-exhibit/v1" as const;

export type ScienceMetricKey =
  | "contactRatio"
  | "densityCvR"
  | "emptyFractionR"
  | "largestVoidR"
  | "largestDenseMass2xR"
  | "pressureP95"
  | "pressureAt255"
  | "totalReinjections";

export type ScienceExhibitExpectation = {
  metric: ScienceMetricKey;
  label: string;
  minimum?: number;
  maximum?: number;
  format: "decimal" | "integer" | "percent" | "ratio";
};

export type ScienceExhibit = {
  schema: typeof SCIENCE_EXHIBIT_SCHEMA;
  revision: number;
  evidenceLevel: "reference-trajectory" | "paired-seed";
  dynamicsVersion: typeof SIMULATION_DYNAMICS_VERSION;
  metricVersion: typeof MORPHOLOGY_METRIC_VERSION;
  referenceRunId?: string;
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  question: string;
  claim: string;
  interpretation: string;
  seed: string;
  width: number;
  height: number;
  measurementStep: number;
  liveFps: number;
  liveStopStep?: number;
  parameters: Readonly<SimulationParams>;
  changedParameters: readonly (keyof SimulationParams)[];
  expectations: readonly ScienceExhibitExpectation[];
};

export type ScienceExhibitDynamics = {
  reinjections: number;
  totalReinjections: number;
};

export type ScienceExpectationResult = ScienceExhibitExpectation & {
  actual: number;
  passed: boolean;
};

export type ScienceComparison = {
  label: string;
  leftExhibitId: string;
  rightExhibitId: string;
  metric: ScienceMetricKey;
  step: number;
  relation: "greaterBy" | "ratioAtLeast";
  threshold: number;
};

const REFERENCE_SEED =
  "0x1b50318e0b301eab6c7147d253268b6a06cdb98920792de015b8927cdd44087a";

const REFERENCE_PARAMETERS: Readonly<SimulationParams> = Object.freeze({
  numMotes: 4200,
  moteRadius: 42,
  pressureDecay: 0.214,
  moteForce: 0.1,
  flowFieldSpacing: 6,
  numDisturbances: 21,
  thetaVariance: 3.14,
  defaultTheta: 0,
  disturbanceRadiusMean: 100,
  disturbanceRadiusVariance: 200,
  disturbanceSpeedMin: 0,
  disturbanceSpeedMax: 0.5,
  flowCoefficient: 0.5,
  cxFlowCoefficient: 1.001,
  boundaryZone: 200,
  boundaryForce: 1,
  boundaryForceMax: 1.5,
  boundarySpawnDepth: 50,
});

const reference = (overrides: Partial<SimulationParams> = {}) =>
  Object.freeze({ ...REFERENCE_PARAMETERS, ...overrides });

/**
 * Durable, deterministic exhibits rendered by `/science` and enforced by CI.
 * Each expectation is intentionally an envelope, not an exact float snapshot.
 */
export const SCIENCE_EXHIBITS: readonly ScienceExhibit[] = Object.freeze([
  {
    schema: SCIENCE_EXHIBIT_SCHEMA,
    revision: 1,
    evidenceLevel: "reference-trajectory",
    dynamicsVersion: SIMULATION_DYNAMICS_VERSION,
    metricVersion: MORPHOLOGY_METRIC_VERSION,
    referenceRunId:
      "940a8f54de54fa255e360295960b434418533f608cdf3fd886e152a379930995",
    id: "self-organization",
    number: "01",
    eyebrow: "Observation · one registered trajectory",
    title: "A uniform cloud makes its own weather",
    question: "Will structure appear without placing a core by hand?",
    claim:
      "In this registered trajectory, the reference rules turn an almost uniform point field into a contact-rich body containing interaction-scale voids.",
    interpretation:
      "The aquarium begins at the checked-in seed and fast-forwards to step 300. Pink regions are not painted shapes: they are motes reporting many nearby neighbors.",
    seed: REFERENCE_SEED,
    width: 622.82,
    height: 1000,
    measurementStep: 300,
    liveFps: 8,
    parameters: reference(),
    changedParameters: [],
    expectations: [
      {
        metric: "contactRatio",
        label: "contact enrichment",
        minimum: 1.65,
        maximum: 1.9,
        format: "ratio",
      },
      {
        metric: "densityCvR",
        label: "density variation at R",
        minimum: 0.68,
        maximum: 0.82,
        format: "decimal",
      },
      {
        metric: "emptyFractionR",
        label: "empty interaction-scale cells",
        minimum: 0.12,
        maximum: 0.2,
        format: "percent",
      },
    ],
  },
  {
    schema: SCIENCE_EXHIBIT_SCHEMA,
    revision: 1,
    evidenceLevel: "paired-seed",
    dynamicsVersion: SIMULATION_DYNAMICS_VERSION,
    metricVersion: MORPHOLOGY_METRIC_VERSION,
    id: "without-soft-wall",
    number: "02",
    eyebrow: "Paired result · one registered seed",
    title: "Open the soft wall",
    question: "Does the moving flow field make the central body by itself?",
    claim:
      "On this paired seed, removing the inward wall force leaves the field locally uneven but removes most interaction-scale empty-cell structure.",
    interpretation:
      "Only the two soft-wall force parameters change. Edge reinjection remains active, so this isolates confinement rather than replacing the entire boundary condition.",
    seed: REFERENCE_SEED,
    width: 622.82,
    height: 1000,
    measurementStep: 300,
    liveFps: 8,
    parameters: reference({ boundaryForce: 0, boundaryForceMax: 0 }),
    changedParameters: ["boundaryForce", "boundaryForceMax"],
    expectations: [
      {
        metric: "densityCvR",
        label: "density variation at R",
        minimum: 0.35,
        maximum: 0.55,
        format: "decimal",
      },
      {
        metric: "emptyFractionR",
        label: "empty interaction-scale cells",
        minimum: 0,
        maximum: 0.03,
        format: "percent",
      },
      {
        metric: "totalReinjections",
        label: "edge reinjections",
        minimum: 3500,
        maximum: 5500,
        format: "integer",
      },
    ],
  },
  {
    schema: SCIENCE_EXHIBIT_SCHEMA,
    revision: 1,
    evidenceLevel: "paired-seed",
    dynamicsVersion: SIMULATION_DYNAMICS_VERSION,
    metricVersion: MORPHOLOGY_METRIC_VERSION,
    id: "without-repulsion",
    number: "03",
    eyebrow: "Paired result · one registered seed",
    title: "Remove pair repulsion",
    question: "Is repulsion creating the clumps—or preventing something worse?",
    claim:
      "On this paired seed, removing the repulsive force lets convergent transport collapse motes into sharply concentrated sinks instead of finite clumps.",
    interpretation:
      "Neighbor counting and its weak flow feedback remain active; only the mechanical pair force is zero. This tank stops before the legacy 8-bit counter saturates. The early divergence suggests that repulsion regularizes aggregation rather than causing it.",
    seed: REFERENCE_SEED,
    width: 622.82,
    height: 1000,
    measurementStep: 100,
    liveFps: 3,
    liveStopStep: 166,
    parameters: reference({ moteForce: 0 }),
    changedParameters: ["moteForce"],
    expectations: [
      {
        metric: "densityCvR",
        label: "density variation at R",
        minimum: 0.95,
        maximum: 1.3,
        format: "decimal",
      },
      {
        metric: "emptyFractionR",
        label: "empty interaction-scale cells",
        minimum: 0.2,
        maximum: 0.35,
        format: "percent",
      },
      {
        metric: "largestVoidR",
        label: "largest connected void at R",
        minimum: 0.18,
        format: "percent",
      },
      {
        metric: "contactRatio",
        label: "contact enrichment",
        minimum: 1.7,
        maximum: 2.4,
        format: "ratio",
      },
      {
        metric: "pressureAt255",
        label: "motes at the 8-bit ceiling",
        maximum: 0,
        format: "percent",
      },
    ],
  },
]);

export const SCIENCE_COMPARISONS: readonly ScienceComparison[] = Object.freeze([
  {
    label: "The soft wall increases interaction-scale density variation",
    leftExhibitId: "self-organization",
    rightExhibitId: "without-soft-wall",
    metric: "densityCvR",
    step: 300,
    relation: "greaterBy",
    threshold: 0.15,
  },
  {
    label: "The soft wall increases interaction-scale empty area",
    leftExhibitId: "self-organization",
    rightExhibitId: "without-soft-wall",
    metric: "emptyFractionR",
    step: 300,
    relation: "greaterBy",
    threshold: 0.1,
  },
  {
    label: "Removing repulsion creates a much sharper collapse",
    leftExhibitId: "without-repulsion",
    rightExhibitId: "self-organization",
    metric: "densityCvR",
    step: 100,
    relation: "ratioAtLeast",
    threshold: 1.8,
  },
  {
    label: "Opening the soft wall greatly increases edge reinjection",
    leftExhibitId: "without-soft-wall",
    rightExhibitId: "self-organization",
    metric: "totalReinjections",
    step: 300,
    relation: "ratioAtLeast",
    threshold: 20,
  },
  {
    label: "The soft wall increases local contact enrichment",
    leftExhibitId: "self-organization",
    rightExhibitId: "without-soft-wall",
    metric: "contactRatio",
    step: 300,
    relation: "ratioAtLeast",
    threshold: 1.25,
  },
]);

export function findScienceExhibit(id: string): ScienceExhibit {
  const exhibit = SCIENCE_EXHIBITS.find((candidate) => candidate.id === id);
  if (!exhibit) throw new Error(`Unknown science exhibit: ${id}`);
  return exhibit;
}

export function readScienceMetric(
  metric: ScienceMetricKey,
  morphology: MorphologyFingerprint,
  dynamics: ScienceExhibitDynamics,
): number {
  const interactionGrid = () => {
    const grid = morphology.grids.find(
      (candidate) => candidate.cellSizeToMoteRadius === 1,
    );
    if (!grid) throw new Error("Morphology is missing its R grid");
    return grid;
  };

  switch (metric) {
    case "contactRatio":
      return morphology.contacts.nominalUniformContactRatio ?? 0;
    case "densityCvR":
      return interactionGrid().densityCoefficientOfVariation;
    case "emptyFractionR":
      return interactionGrid().emptyCellFraction;
    case "largestVoidR":
      return interactionGrid().emptyVoids.largestCellFraction;
    case "largestDenseMass2xR": {
      const denseAtTwiceMean = interactionGrid().denseComponents.find(
        (component) => component.thresholdToMean === 2,
      );
      if (!denseAtTwiceMean) {
        throw new Error("Morphology is missing its 2x dense-component metric");
      }
      return denseAtTwiceMean.largestMassFraction;
    }
    case "pressureP95":
      return morphology.pressure.p95;
    case "pressureAt255":
      return morphology.pressure.fractionAt255;
    case "totalReinjections":
      return dynamics.totalReinjections;
  }
}

export function evaluateScienceExhibit(
  exhibit: ScienceExhibit,
  morphology: MorphologyFingerprint,
  dynamics: ScienceExhibitDynamics,
): ScienceExpectationResult[] {
  return exhibit.expectations.map((expectation) => {
    const actual = readScienceMetric(expectation.metric, morphology, dynamics);
    const aboveMinimum =
      expectation.minimum === undefined || actual >= expectation.minimum;
    const belowMaximum =
      expectation.maximum === undefined || actual <= expectation.maximum;
    return {
      ...expectation,
      actual,
      passed: aboveMinimum && belowMaximum,
    };
  });
}

export function formatScienceMetric(
  value: number,
  format: ScienceExhibitExpectation["format"],
): string {
  switch (format) {
    case "integer":
      return Math.round(value).toLocaleString("en-US");
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "ratio":
      return `${value.toFixed(2)}×`;
    case "decimal":
      return value.toFixed(3);
  }
}
