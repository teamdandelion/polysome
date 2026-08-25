import { FlowField } from "./flowField.ts";
import { MoteSimulator, type MoteSimulatorState } from "./moteSimulator.ts";
import type { SimulationPerformance } from "./performance.ts";
import { SimulationParams } from "./simulationParams.ts";

/**
 * Identifies the exact update rules inherited from the original artwork.
 * Future numerical or modeling changes must receive a new identifier.
 */
export const SIMULATION_DYNAMICS_VERSION = "legacy-v1" as const;
export const SIMULATION_CHECKPOINT_SCHEMA = "polysome.checkpoint/v1" as const;

export type SimulationOptions = {
  parameters?: Partial<SimulationParams>;
};

/**
 * A zero-copy observation at the post-move display boundary.
 *
 * Positions are the result of `step`; pressure and collisionPairs describe the
 * neighbor calculation immediately before that move. Typed arrays remain owned
 * by the simulation and change on the next step. Call `checkpoint()` when an
 * immutable copy is required.
 */
export type SimulationView = {
  dynamicsVersion: typeof SIMULATION_DYNAMICS_VERSION;
  step: number;
  width: number;
  height: number;
  moteRadius: number;
  moteX: Float32Array;
  moteY: Float32Array;
  motePressure: Uint8Array;
  collisionPairs: number;
  /** Motes teleported back to an edge at the beginning of the latest step. */
  reinjections: number;
  /** Cumulative edge reinjections since initialization. */
  totalReinjections: number;
};

export type SimulationCheckpoint = {
  schema: typeof SIMULATION_CHECKPOINT_SCHEMA;
  dynamicsVersion: typeof SIMULATION_DYNAMICS_VERSION;
  seed: string;
  width: number;
  height: number;
  parameters: SimulationParams;
  state: MoteSimulatorState;
};

/** Browser-free deterministic Polysome state evolution. */
export class Simulation {
  readonly dynamicsVersion = SIMULATION_DYNAMICS_VERSION;
  readonly seed: string;
  readonly width: number;
  readonly height: number;
  readonly parameters: SimulationParams;

  private readonly simulator: MoteSimulator;

  constructor(
    seed: string,
    width: number,
    height: number,
    options: SimulationOptions = {},
  ) {
    if (typeof seed !== "string" || seed.length === 0) {
      throw new Error("Simulation seed must be a non-empty string");
    }
    if (!Number.isFinite(width) || width <= 0) {
      throw new Error("Simulation width must be finite and positive");
    }
    if (!Number.isFinite(height) || height <= 0) {
      throw new Error("Simulation height must be finite and positive");
    }

    const parameters = Object.assign(
      new SimulationParams(),
      options.parameters,
    );
    if (!Number.isInteger(parameters.numMotes) || parameters.numMotes <= 0) {
      throw new Error("numMotes must be a positive integer");
    }
    if (!Number.isFinite(parameters.moteRadius) || parameters.moteRadius <= 0) {
      throw new Error("moteRadius must be finite and positive");
    }
    if (
      !Number.isFinite(parameters.flowFieldSpacing) ||
      parameters.flowFieldSpacing <= 0
    ) {
      throw new Error("flowFieldSpacing must be finite and positive");
    }

    this.seed = seed;
    this.width = width;
    this.height = height;
    this.parameters = Object.freeze(parameters);
    this.simulator = new MoteSimulator(parameters, seed, width, height);
  }

  /** Advance one step, optionally collecting wall-clock profiling data. */
  step(collectPerformance = false): SimulationPerformance | null {
    return this.simulator.step(collectPerformance);
  }

  /** Advance an exact number of model steps without rendering or timing work. */
  advance(steps: number): void {
    if (!Number.isInteger(steps) || steps < 0) {
      throw new Error("advance(steps) requires a non-negative integer");
    }
    for (let step = 0; step < steps; step++) {
      this.simulator.step(false);
    }
  }

  /** Return a zero-copy view suitable for pure measurement or rendering. */
  view(): SimulationView {
    return {
      dynamicsVersion: this.dynamicsVersion,
      step: this.simulator.stepCounter,
      width: this.width,
      height: this.height,
      moteRadius: this.parameters.moteRadius,
      moteX: this.simulator.moteX,
      moteY: this.simulator.moteY,
      motePressure: this.simulator.motePressure,
      collisionPairs: this.simulator.collisionPairs,
      reinjections: this.simulator.reinjections,
      totalReinjections: this.simulator.totalReinjections,
    };
  }

  /** Capture a complete in-memory continuation checkpoint. */
  checkpoint(): SimulationCheckpoint {
    return {
      schema: SIMULATION_CHECKPOINT_SCHEMA,
      dynamicsVersion: this.dynamicsVersion,
      seed: this.seed,
      width: this.width,
      height: this.height,
      parameters: Object.assign(new SimulationParams(), this.parameters),
      state: this.simulator.captureState(),
    };
  }

  /** Restore a checkpoint into a simulation with the same immutable spec. */
  restore(checkpoint: SimulationCheckpoint): void {
    if (checkpoint.schema !== SIMULATION_CHECKPOINT_SCHEMA) {
      throw new Error(`Unsupported checkpoint schema: ${checkpoint.schema}`);
    }
    if (checkpoint.dynamicsVersion !== this.dynamicsVersion) {
      throw new Error(
        `Checkpoint dynamics ${checkpoint.dynamicsVersion} do not match ${this.dynamicsVersion}`,
      );
    }
    if (
      checkpoint.seed !== this.seed ||
      checkpoint.width !== this.width ||
      checkpoint.height !== this.height
    ) {
      throw new Error("Checkpoint seed or bounds do not match this simulation");
    }

    const parameterKeys = Object.keys(new SimulationParams()) as Array<
      keyof SimulationParams
    >;
    const mismatch = parameterKeys.find(
      (key) => checkpoint.parameters[key] !== this.parameters[key],
    );
    if (mismatch !== undefined) {
      throw new Error(
        `Checkpoint parameter does not match: ${String(mismatch)}`,
      );
    }

    this.simulator.restoreState(checkpoint.state);
  }

  /** Construct and restore a simulation directly from a checkpoint. */
  static fromCheckpoint(checkpoint: SimulationCheckpoint): Simulation {
    const simulation = new Simulation(
      checkpoint.seed,
      checkpoint.width,
      checkpoint.height,
      { parameters: checkpoint.parameters },
    );
    simulation.restore(checkpoint);
    return simulation;
  }

  /** Exposed for diagnostic flow-field renderers and scientific probes. */
  get flowField(): FlowField {
    return this.simulator.flowField;
  }
}
