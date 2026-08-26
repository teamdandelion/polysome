import { MoteSimulator } from "./moteSimulator.ts";
import { SimulationParams } from "./simulationParams.ts";

export type SimulationOptions = {
  simulation?: Partial<SimulationParams>;
};

export type SimulationView = {
  step: number;
  width: number;
  height: number;
  moteRadius: number;
  moteX: Float32Array;
  moteY: Float32Array;
  motePressure: Uint8Array;
};

/**
 * A browser-free view of the same mote simulator used by `Instance`.
 *
 * This adapter owns no rendering clock. Notebook Workers use it to evolve
 * current-build state away from the main thread.
 */
export class Simulation {
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
    this.seed = seed;
    this.width = width;
    this.height = height;
    this.parameters = Object.assign(new SimulationParams(), options.simulation);
    this.simulator = new MoteSimulator(this.parameters, seed, width, height);
  }

  step(): void {
    this.simulator.step(false);
  }

  advance(steps: number): void {
    if (!Number.isInteger(steps) || steps < 0) {
      throw new Error("advance(steps) requires a non-negative integer");
    }
    for (let step = 0; step < steps; step++) {
      this.step();
    }
  }

  view(): SimulationView {
    return {
      step: this.simulator.stepCounter,
      width: this.width,
      height: this.height,
      moteRadius: this.parameters.moteRadius,
      moteX: this.simulator.moteX,
      moteY: this.simulator.moteY,
      motePressure: this.simulator.motePressure,
    };
  }
}
