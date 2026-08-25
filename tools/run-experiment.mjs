#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const DEFAULT_SPEC = path.join(
  REPOSITORY_ROOT,
  "experiments/current-portrait-baseline.json",
);
const PACKAGE_JSON = path.join(REPOSITORY_ROOT, "package.json");
const BUILT_ENGINE = path.join(REPOSITORY_ROOT, "dist/index.js");
const EXPERIMENT_SCHEMA = "polysome.experiment/v1";
const RESULT_SCHEMA = "polysome.experiment-result/v1";

const PARAMETER_RULES = {
  numMotes: { integer: true, min: 1 },
  moteRadius: { exclusiveMin: 0 },
  pressureDecay: { exclusiveMin: 0, max: 1 },
  moteForce: { min: 0 },
  flowFieldSpacing: { exclusiveMin: 0 },
  numDisturbances: { integer: true, min: 0 },
  thetaVariance: { min: 0 },
  defaultTheta: {},
  disturbanceRadiusMean: { min: 0 },
  disturbanceRadiusVariance: { min: 0 },
  disturbanceSpeedMin: { min: 0 },
  disturbanceSpeedMax: { min: 0 },
  flowCoefficient: { min: 0 },
  cxFlowCoefficient: { exclusiveMin: 0 },
  boundaryZone: { exclusiveMin: 0 },
  boundaryForce: { min: 0 },
  boundaryForceMax: { min: 0 },
  boundarySpawnDepth: { min: 0 },
};

function usage() {
  return `Usage: node tools/run-experiment.mjs [options]

Options:
  --spec PATH    Experiment manifest (default: experiments/current-portrait-baseline.json)
  --output PATH  Write the result to PATH instead of stdout; use - for stdout
  --until STEP   Stop at STEP, retaining the manifest's runId (useful for smoke tests)
  -h, --help     Show this help
`;
}

function parseArguments(argv) {
  const options = { spec: DEFAULT_SPEC, output: "-", until: undefined };

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

    if (!["--spec", "--output", "--until"].includes(flag)) {
      throw new Error(`Unknown argument: ${argument}`);
    }

    const value = inlineValue ?? argv[++index];
    if (value === undefined || value.length === 0) {
      throw new Error(`${flag} requires a value`);
    }

    if (flag === "--spec") options.spec = path.resolve(value);
    if (flag === "--output") {
      options.output = value === "-" ? "-" : path.resolve(value);
    }
    if (flag === "--until") {
      const until = Number(value);
      if (!Number.isSafeInteger(until) || until < 0) {
        throw new Error("--until must be a non-negative safe integer");
      }
      options.until = until;
    }
  }

  return options;
}

function assertObject(value, location) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${location} must be an object`);
  }
}

function assertExactKeys(value, keys, location) {
  assertObject(value, location);
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  if (
    expected.length !== actual.length ||
    expected.some((key, index) => key !== actual[index])
  ) {
    throw new Error(
      `${location} must contain exactly: ${expected.join(", ")}; received: ${actual.join(", ")}`,
    );
  }
}

function assertFiniteNumber(value, location, rule = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${location} must be a finite number`);
  }
  if (rule.integer && !Number.isSafeInteger(value)) {
    throw new Error(`${location} must be a safe integer`);
  }
  if (rule.min !== undefined && value < rule.min) {
    throw new Error(`${location} must be at least ${rule.min}`);
  }
  if (rule.exclusiveMin !== undefined && value <= rule.exclusiveMin) {
    throw new Error(`${location} must be greater than ${rule.exclusiveMin}`);
  }
  if (rule.max !== undefined && value > rule.max) {
    throw new Error(`${location} must be at most ${rule.max}`);
  }
}

function validateManifest(manifest) {
  assertExactKeys(
    manifest,
    [
      "schema",
      "label",
      "dynamicsVersion",
      "seed",
      "bounds",
      "parameters",
      "measurements",
      "render",
    ],
    "manifest",
  );

  if (manifest.schema !== EXPERIMENT_SCHEMA) {
    throw new Error(
      `manifest.schema must be ${JSON.stringify(EXPERIMENT_SCHEMA)}`,
    );
  }
  if (typeof manifest.label !== "string" || manifest.label.length === 0) {
    throw new Error("manifest.label must be a non-empty string");
  }
  if (
    typeof manifest.dynamicsVersion !== "string" ||
    manifest.dynamicsVersion.length === 0
  ) {
    throw new Error("manifest.dynamicsVersion must be a non-empty string");
  }
  if (
    typeof manifest.seed !== "string" ||
    !/^0x[0-9a-fA-F]{64}$/.test(manifest.seed)
  ) {
    throw new Error("manifest.seed must be a 32-byte 0x-prefixed hex string");
  }

  assertExactKeys(manifest.bounds, ["width", "height"], "manifest.bounds");
  assertFiniteNumber(manifest.bounds.width, "manifest.bounds.width", {
    exclusiveMin: 0,
  });
  assertFiniteNumber(manifest.bounds.height, "manifest.bounds.height", {
    exclusiveMin: 0,
  });

  const parameterNames = Object.keys(PARAMETER_RULES);
  assertExactKeys(manifest.parameters, parameterNames, "manifest.parameters");
  for (const [name, rule] of Object.entries(PARAMETER_RULES)) {
    assertFiniteNumber(
      manifest.parameters[name],
      `manifest.parameters.${name}`,
      rule,
    );
  }
  if (
    manifest.parameters.disturbanceSpeedMin >
    manifest.parameters.disturbanceSpeedMax
  ) {
    throw new Error(
      "manifest.parameters.disturbanceSpeedMin must not exceed disturbanceSpeedMax",
    );
  }
  if (
    manifest.parameters.boundarySpawnDepth > manifest.parameters.boundaryZone
  ) {
    throw new Error(
      "manifest.parameters.boundarySpawnDepth must not exceed boundaryZone",
    );
  }

  assertExactKeys(manifest.measurements, ["atSteps"], "manifest.measurements");
  const steps = manifest.measurements.atSteps;
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error("manifest.measurements.atSteps must be a non-empty array");
  }
  let previousStep = 0;
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    if (!Number.isSafeInteger(step) || step <= previousStep) {
      throw new Error(
        "manifest.measurements.atSteps must contain strictly increasing positive safe integers",
      );
    }
    previousStep = step;
  }

  assertExactKeys(
    manifest.render,
    ["burnInSteps", "recordSteps", "fps"],
    "manifest.render",
  );
  assertFiniteNumber(
    manifest.render.burnInSteps,
    "manifest.render.burnInSteps",
    { integer: true, min: 0 },
  );
  assertFiniteNumber(
    manifest.render.recordSteps,
    "manifest.render.recordSteps",
    { integer: true, min: 1 },
  );
  assertFiniteNumber(manifest.render.fps, "manifest.render.fps", {
    integer: true,
    min: 1,
  });

  return manifest;
}

function runDefinition(manifest) {
  return {
    schema: manifest.schema,
    dynamicsVersion: manifest.dynamicsVersion,
    seed: manifest.seed.toLowerCase(),
    bounds: manifest.bounds,
    parameters: manifest.parameters,
    measurements: manifest.measurements,
    render: manifest.render,
  };
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
  if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    return Array.from(value, (item, index) =>
      normalizeJson(item, `${location}[${index}]`),
    );
  }
  if (typeof value === "object") {
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
      const child = value[key];
      if (child === undefined) {
        throw new Error(`${location}.${key} is undefined`);
      }
      normalized[key] = normalizeJson(child, `${location}.${key}`);
    }
    return normalized;
  }
  throw new Error(`${location} is not JSON-serializable`);
}

function canonicalJson(value) {
  return JSON.stringify(normalizeJson(value));
}

function runIdFor(definition) {
  return createHash("sha256").update(canonicalJson(definition)).digest("hex");
}

async function readProvenance() {
  const packageJson = JSON.parse(await readFile(PACKAGE_JSON, "utf8"));
  let gitCommit = null;
  try {
    gitCommit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // A source archive may not contain .git. The package version still identifies it.
  }

  return {
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    gitCommit,
  };
}

async function loadEngine() {
  try {
    return await import(pathToFileURL(BUILT_ENGINE).href);
  } catch (error) {
    throw new Error(
      `Could not load ${BUILT_ENGINE}. Run \"npm run build\" first. (${error.message})`,
    );
  }
}

function appliedParameters(simulation) {
  const result = {};
  for (const name of Object.keys(PARAMETER_RULES)) {
    result[name] = simulation.parameters?.[name];
  }
  return result;
}

async function run(options) {
  const manifest = validateManifest(
    JSON.parse(await readFile(options.spec, "utf8")),
  );
  const definition = runDefinition(manifest);
  const runId = runIdFor(definition);
  const finalMeasurementStep =
    manifest.measurements.atSteps[manifest.measurements.atSteps.length - 1];
  const untilStep = options.until ?? finalMeasurementStep;
  if (untilStep > finalMeasurementStep) {
    throw new Error(
      `--until cannot exceed the final measurement step (${finalMeasurementStep})`,
    );
  }

  const { Simulation, measureMorphology } = await loadEngine();
  if (
    typeof Simulation !== "function" ||
    typeof measureMorphology !== "function"
  ) {
    throw new Error(
      "The built package must export Simulation and measureMorphology",
    );
  }

  const simulation = new Simulation(
    definition.seed,
    definition.bounds.width,
    definition.bounds.height,
    { parameters: definition.parameters },
  );
  if (simulation.dynamicsVersion !== definition.dynamicsVersion) {
    throw new Error(
      `Manifest requests dynamics ${definition.dynamicsVersion}, but the engine reports ${simulation.dynamicsVersion}`,
    );
  }
  if (
    canonicalJson(appliedParameters(simulation)) !==
    canonicalJson(definition.parameters)
  ) {
    throw new Error("The engine did not apply the manifest parameters exactly");
  }

  const measurements = [];
  let currentStep = 0;
  for (const checkpoint of definition.measurements.atSteps) {
    if (checkpoint > untilStep) break;
    simulation.advance(checkpoint - currentStep);
    currentStep = checkpoint;
    const view = simulation.view();
    measurements.push({
      step: checkpoint,
      dynamics: {
        reinjections: view.reinjections,
        totalReinjections: view.totalReinjections,
      },
      morphology: normalizeJson(
        measureMorphology(view),
        `measurement at step ${checkpoint}`,
      ),
    });
  }

  const result = {
    schema: RESULT_SCHEMA,
    runId,
    label: manifest.label,
    definition,
    provenance: await readProvenance(),
    execution: {
      untilStep,
      finalMeasurementStep,
      complete: untilStep === finalMeasurementStep,
    },
    measurements,
  };
  return `${JSON.stringify(normalizeJson(result), null, 2)}\n`;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const output = await run(options);
  if (options.output === "-") {
    process.stdout.write(output);
    return;
  }

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, output, "utf8");
}

main().catch((error) => {
  process.stderr.write(`run-experiment: ${error.message}\n`);
  process.exitCode = 1;
});
