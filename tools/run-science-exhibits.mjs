#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { measureMorphology } from "../src/morphology.ts";
import {
  SCIENCE_COMPARISONS,
  SCIENCE_EXHIBITS,
  SCIENCE_EXHIBIT_SCHEMA,
  evaluateScienceExhibit,
  readScienceMetric,
} from "../src/scienceExhibits.ts";
import { Simulation } from "../src/simulation.ts";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const PACKAGE_JSON = path.join(REPOSITORY_ROOT, "package.json");
const BASELINE_RESULT = path.join(
  REPOSITORY_ROOT,
  "experiments/results/current-portrait-baseline.json",
);
const EVIDENCE_SCHEMA = "polysome.science-exhibit-evidence/v1";
const GENERATOR_PATH = "tools/run-science-exhibits.mjs";
const DEFAULT_RESULT_PATH = "experiments/results/science-exhibits.json";

function usage() {
  return `Usage: node --experimental-strip-types ${GENERATOR_PATH} [options]

Run every registered science exhibit and emit deterministic, checked-in evidence.

Options:
  --output PATH  Write generated evidence to PATH instead of stdout
  --check PATH   Fail unless PATH contains the current generated evidence
  -h, --help     Show this help

Examples:
  node --experimental-strip-types ${GENERATOR_PATH} --output ${DEFAULT_RESULT_PATH}
  node --experimental-strip-types ${GENERATOR_PATH} --check ${DEFAULT_RESULT_PATH}
`;
}

function parseArguments(argv) {
  const options = { output: "-", check: undefined, help: false };

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "-h" || argument === "--help") {
      options.help = true;
      continue;
    }

    const equalsIndex = argument.indexOf("=");
    const flag = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const inlineValue =
      equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);
    if (flag !== "--output" && flag !== "--check") {
      throw new Error(`Unknown argument: ${argument}`);
    }

    const value = inlineValue ?? argv[++index];
    if (value === undefined || value.length === 0) {
      throw new Error(`${flag} requires a path`);
    }
    options[flag.slice(2)] = path.resolve(value);
  }

  if (options.check !== undefined && options.output !== "-") {
    throw new Error("--check and --output cannot be used together");
  }
  return options;
}

function normalizeJson(value, location = "value") {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${location} contains a non-finite number`);
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      normalizeJson(item, `${location}[${index}]`),
    );
  }
  if (typeof value === "object") {
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
      const child = value[key];
      if (child !== undefined) {
        normalized[key] = normalizeJson(child, `${location}.${key}`);
      }
    }
    return normalized;
  }
  throw new Error(`${location} is not JSON-serializable`);
}

function canonicalJson(value) {
  return JSON.stringify(normalizeJson(value));
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

/** Avoid locking platform-irrelevant floating-point noise into the exhibit. */
function measuredNumber(value) {
  return Number.isSafeInteger(value) ? value : Number(value.toFixed(6));
}

function expectationBounds(expectation) {
  return {
    ...(expectation.minimum === undefined
      ? {}
      : { minimum: expectation.minimum }),
    ...(expectation.maximum === undefined
      ? {}
      : { maximum: expectation.maximum }),
  };
}

function measurementDefinition(exhibit) {
  return {
    schema: exhibit.schema,
    revision: exhibit.revision,
    id: exhibit.id,
    evidenceLevel: exhibit.evidenceLevel,
    dynamicsVersion: exhibit.dynamicsVersion,
    metricVersion: exhibit.metricVersion,
    ...(exhibit.referenceRunId === undefined
      ? {}
      : { referenceRunId: exhibit.referenceRunId }),
    seed: exhibit.seed.toLowerCase(),
    bounds: { width: exhibit.width, height: exhibit.height },
    measurementStep: exhibit.measurementStep,
    ...(exhibit.liveStopStep === undefined
      ? {}
      : { liveStopStep: exhibit.liveStopStep }),
    parameters: exhibit.parameters,
    changedParameters: exhibit.changedParameters,
    expectations: exhibit.expectations.map((expectation) => ({
      metric: expectation.metric,
      ...expectationBounds(expectation),
    })),
  };
}

function requiredMeasurements() {
  const stepsByExhibit = new Map(
    SCIENCE_EXHIBITS.map((exhibit) => [
      exhibit.id,
      new Set([exhibit.measurementStep]),
    ]),
  );
  for (const comparison of SCIENCE_COMPARISONS) {
    stepsByExhibit.get(comparison.leftExhibitId)?.add(comparison.step);
    stepsByExhibit.get(comparison.rightExhibitId)?.add(comparison.step);
  }
  return stepsByExhibit;
}

function runRegisteredTrajectories() {
  const observations = new Map();
  const stepsByExhibit = requiredMeasurements();

  for (const exhibit of SCIENCE_EXHIBITS) {
    const simulation = new Simulation(
      exhibit.seed,
      exhibit.width,
      exhibit.height,
      {
        parameters: exhibit.parameters,
      },
    );
    if (simulation.dynamicsVersion !== exhibit.dynamicsVersion) {
      throw new Error(
        `${exhibit.id} requests ${exhibit.dynamicsVersion}, but the engine reports ${simulation.dynamicsVersion}`,
      );
    }

    let currentStep = 0;
    const steps = [...stepsByExhibit.get(exhibit.id)].sort(
      (left, right) => left - right,
    );
    for (const step of steps) {
      simulation.advance(step - currentStep);
      currentStep = step;
      const view = simulation.view();
      observations.set(`${exhibit.id}:${step}`, {
        morphology: measureMorphology(view),
        dynamics: {
          reinjections: view.reinjections,
          totalReinjections: view.totalReinjections,
        },
      });
    }
  }
  return observations;
}

function exhibitEvidence(exhibit, observation) {
  const definition = measurementDefinition(exhibit);
  const evaluations = evaluateScienceExhibit(
    exhibit,
    observation.morphology,
    observation.dynamics,
  );
  return {
    id: exhibit.id,
    title: exhibit.title,
    identity: {
      definitionSha256: sha256(definition),
      dynamicsVersion: exhibit.dynamicsVersion,
      evidenceLevel: exhibit.evidenceLevel,
      exhibitRevision: exhibit.revision,
      exhibitSchema: exhibit.schema,
      metricVersion: exhibit.metricVersion,
    },
    run: {
      bounds: { width: exhibit.width, height: exhibit.height },
      changedParameters: exhibit.changedParameters,
      ...(exhibit.liveStopStep === undefined
        ? {}
        : { liveStopStep: exhibit.liveStopStep }),
      measurementStep: exhibit.measurementStep,
      parameters: exhibit.parameters,
      seed: exhibit.seed.toLowerCase(),
    },
    expectations: evaluations.map((evaluation) => ({
      metric: evaluation.metric,
      label: evaluation.label,
      ...expectationBounds(evaluation),
      actual: measuredNumber(evaluation.actual),
      passed: evaluation.passed,
    })),
    passed: evaluations.every(({ passed }) => passed),
  };
}

function comparisonEvidence(comparison, observations) {
  const left = observations.get(
    `${comparison.leftExhibitId}:${comparison.step}`,
  );
  const right = observations.get(
    `${comparison.rightExhibitId}:${comparison.step}`,
  );
  if (!left || !right) {
    throw new Error(`Missing observation for comparison: ${comparison.label}`);
  }
  const leftActual = readScienceMetric(
    comparison.metric,
    left.morphology,
    left.dynamics,
  );
  const rightActual = readScienceMetric(
    comparison.metric,
    right.morphology,
    right.dynamics,
  );
  const observed =
    comparison.relation === "greaterBy"
      ? leftActual - rightActual
      : rightActual === 0
        ? null
        : leftActual / rightActual;
  const passed = observed !== null && observed >= comparison.threshold;

  return {
    label: comparison.label,
    leftExhibitId: comparison.leftExhibitId,
    rightExhibitId: comparison.rightExhibitId,
    metric: comparison.metric,
    step: comparison.step,
    relation: comparison.relation,
    threshold: comparison.threshold,
    leftActual: measuredNumber(leftActual),
    rightActual: measuredNumber(rightActual),
    observed: observed === null ? null : measuredNumber(observed),
    passed,
  };
}

function baselineMeasurement(result, step) {
  const measurement = result.measurements.find(
    (candidate) => candidate.step === step,
  );
  if (!measurement) {
    throw new Error(`The baseline trajectory has no step ${step} measurement`);
  }
  return measurement;
}

function checkBound(actual, { minimum, maximum }) {
  return (
    (minimum === undefined || actual >= minimum) &&
    (maximum === undefined || actual <= maximum)
  );
}

function trajectoryClaim(id, label, actual, bounds) {
  return {
    id,
    label,
    actual: measuredNumber(actual),
    ...bounds,
    passed: checkBound(actual, bounds),
  };
}

async function validateBaselineTrajectory(reference) {
  const baseline = JSON.parse(await readFile(BASELINE_RESULT, "utf8"));
  const definition = baseline.definition;
  const expectedRunId = createHash("sha256")
    .update(canonicalJson(definition))
    .digest("hex");
  if (baseline.runId !== expectedRunId) {
    throw new Error(
      "The baseline trajectory runId does not match its definition",
    );
  }
  if (
    definition.dynamicsVersion !== reference.dynamicsVersion ||
    definition.seed.toLowerCase() !== reference.seed.toLowerCase() ||
    canonicalJson(definition.bounds) !==
      canonicalJson({ width: reference.width, height: reference.height }) ||
    canonicalJson(definition.parameters) !== canonicalJson(reference.parameters)
  ) {
    throw new Error(
      "The 9,000-step baseline trajectory no longer describes the reference exhibit",
    );
  }
  if (
    baseline.execution?.complete !== true ||
    baseline.execution?.finalMeasurementStep !== 9000 ||
    baseline.execution?.untilStep !== 9000
  ) {
    throw new Error(
      "The checked-in baseline must be complete through step 9,000",
    );
  }

  const at1 = baselineMeasurement(baseline, 1);
  const at300 = baselineMeasurement(baseline, 300);
  const mature = [900, 1800, 3600, 9000].map((step) =>
    baselineMeasurement(baseline, step),
  );
  const allMeasurements = baseline.measurements;
  const metric = (measurement, name) =>
    readScienceMetric(name, measurement.morphology, measurement.dynamics);

  const claims = [
    trajectoryClaim(
      "near-uniform-start",
      "The seeded cloud begins near the nominal uniform contact density",
      metric(at1, "contactRatio"),
      { minimum: 0.85, maximum: 1.1 },
    ),
    trajectoryClaim(
      "contact-enrichment-emerges",
      "Contact enrichment is present by step 300",
      metric(at300, "contactRatio"),
      { minimum: 1.65 },
    ),
    trajectoryClaim(
      "interaction-scale-voids-emerge",
      "Interaction-scale empty regions are present by step 300",
      metric(at300, "emptyFractionR"),
      { minimum: 0.12 },
    ),
    trajectoryClaim(
      "density-variation-rises",
      "Interaction-scale density variation rises from step 1 to step 300",
      metric(at300, "densityCvR") - metric(at1, "densityCvR"),
      { minimum: 0.4 },
    ),
    trajectoryClaim(
      "mature-contact-enrichment-persists",
      "Contact enrichment persists at every mature checkpoint",
      Math.min(
        ...mature.map((measurement) => metric(measurement, "contactRatio")),
      ),
      { minimum: 1.75 },
    ),
    trajectoryClaim(
      "mature-density-variation-persists",
      "Density variation persists at every mature checkpoint",
      Math.min(
        ...mature.map((measurement) => metric(measurement, "densityCvR")),
      ),
      { minimum: 0.75 },
    ),
    trajectoryClaim(
      "pressure-counter-remains-unsaturated",
      "No recorded checkpoint reaches the 8-bit pressure ceiling",
      Math.max(
        ...allMeasurements.map((measurement) =>
          metric(measurement, "pressureAt255"),
        ),
      ),
      { maximum: 0 },
    ),
  ];

  return {
    source: path.relative(REPOSITORY_ROOT, BASELINE_RESULT),
    sourceEvidenceSha256: sha256({
      definition: baseline.definition,
      execution: baseline.execution,
      measurements: baseline.measurements,
    }),
    runId: baseline.runId,
    finalStep: 9000,
    claims,
    passed: claims.every(({ passed }) => passed),
  };
}

async function generateEvidence() {
  const packageJson = JSON.parse(await readFile(PACKAGE_JSON, "utf8"));
  const observations = runRegisteredTrajectories();
  const exhibits = SCIENCE_EXHIBITS.map((exhibit) => {
    const observation = observations.get(
      `${exhibit.id}:${exhibit.measurementStep}`,
    );
    if (!observation) throw new Error(`Missing observation for ${exhibit.id}`);
    return exhibitEvidence(exhibit, observation);
  });
  const comparisons = SCIENCE_COMPARISONS.map((comparison) =>
    comparisonEvidence(comparison, observations),
  );
  const trajectory = await validateBaselineTrajectory(SCIENCE_EXHIBITS[0]);
  const exhibitExpectations = exhibits.flatMap(
    (exhibit) => exhibit.expectations,
  );
  const passed =
    exhibits.every((exhibit) => exhibit.passed) &&
    comparisons.every((comparison) => comparison.passed) &&
    trajectory.passed;

  return normalizeJson({
    schema: EVIDENCE_SCHEMA,
    provenance: {
      packageName: packageJson.name,
      generator: GENERATOR_PATH,
      catalog: "src/scienceExhibits.ts",
      baselineTrajectory: path.relative(REPOSITORY_ROOT, BASELINE_RESULT),
      volatileFieldsExcluded: ["generatedAt", "gitCommit", "nodeVersion"],
    },
    catalog: {
      exhibitSchema: SCIENCE_EXHIBIT_SCHEMA,
      exhibitCount: SCIENCE_EXHIBITS.length,
      comparisonCount: SCIENCE_COMPARISONS.length,
    },
    summary: {
      passed,
      exhibitExpectationsPassed: exhibitExpectations.filter(
        (expectation) => expectation.passed,
      ).length,
      exhibitExpectationsTotal: exhibitExpectations.length,
      comparisonsPassed: comparisons.filter(({ passed }) => passed).length,
      comparisonsTotal: comparisons.length,
      trajectoryClaimsPassed: trajectory.claims.filter(({ passed }) => passed)
        .length,
      trajectoryClaimsTotal: trajectory.claims.length,
    },
    exhibits,
    comparisons,
    trajectory,
  });
}

function describeFailures(evidence) {
  const failures = [];
  for (const exhibit of evidence.exhibits) {
    for (const expectation of exhibit.expectations) {
      if (!expectation.passed) {
        failures.push(
          `${exhibit.id}: ${expectation.metric} = ${expectation.actual}`,
        );
      }
    }
  }
  for (const comparison of evidence.comparisons) {
    if (!comparison.passed) failures.push(`comparison: ${comparison.label}`);
  }
  for (const claim of evidence.trajectory.claims) {
    if (!claim.passed) failures.push(`trajectory: ${claim.label}`);
  }
  return failures.join("; ");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const evidence = await generateEvidence();
  const output = `${JSON.stringify(evidence, null, 2)}\n`;
  if (!evidence.summary.passed) {
    throw new Error(`Science claims failed: ${describeFailures(evidence)}`);
  }

  if (options.check !== undefined) {
    let checkedIn;
    try {
      checkedIn = JSON.parse(await readFile(options.check, "utf8"));
    } catch (error) {
      throw new Error(`Could not read ${options.check}: ${error.message}`);
    }
    if (canonicalJson(checkedIn) !== canonicalJson(evidence)) {
      throw new Error(
        `Science evidence drifted. Regenerate it with:\n  node --experimental-strip-types ${GENERATOR_PATH} --output ${path.relative(process.cwd(), options.check)}`,
      );
    }
    process.stdout.write(
      `Science evidence is current: ${path.relative(process.cwd(), options.check)}\n`,
    );
    return;
  }

  if (options.output === "-") {
    process.stdout.write(output);
    return;
  }
  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, output, "utf8");
  process.stdout.write(
    `Wrote science evidence: ${path.relative(process.cwd(), options.output)}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`run-science-exhibits: ${error.message}\n`);
  process.exitCode = 1;
});
