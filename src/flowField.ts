import { pi } from "./safeMath.ts";
import { Rng } from "./random.ts";
import { SimulationParams } from "./simulationParams.ts";
import { Vector } from "./vector.ts";

export type FlowFieldDisturbance = {
  pos: Vector;
  vel: Vector;
  theta: number;
  radius: number;
};

export type FlowFieldState = {
  defaultTheta: number;
  disturbances: Array<{
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    theta: number;
    radius: number;
  }>;
};

export class FlowField {
  private params: SimulationParams;
  private spacing: number;
  private defaultTheta: number;

  disturbances: FlowFieldDisturbance[] = [];
  bounds: Vector;
  rng: Rng;

  fieldPoints: Float64Array[]; // Angle (theta) in a grid on the field
  private iMax: number; // Cache grid dimensions
  private jMax: number;

  constructor(rng: Rng, params: SimulationParams, bounds: Vector) {
    this.rng = rng;
    this.params = params;
    this.bounds = bounds;
    this.spacing = params.flowFieldSpacing;
    this.defaultTheta = rng.uniform(0, pi(2));

    // Pre-allocate fieldPoints array once
    this.iMax = Math.ceil(bounds.x / this.spacing);
    this.jMax = Math.ceil(bounds.y / this.spacing);
    this.fieldPoints = Array.from(
      { length: this.iMax },
      () => new Float64Array(this.jMax),
    );

    this.disturbances = [];
    while (this.disturbances.length < params.numDisturbances) {
      this.addDisturbance();
    }
    this.computeFlowField();
  }

  inBounds(pos: Vector) {
    return (
      pos.x >= 0 &&
      pos.x <= this.bounds.x &&
      pos.y >= 0 &&
      pos.y <= this.bounds.y
    );
  }

  addDisturbance() {
    const disturbanceX = this.rng.uniform(0, this.bounds.x);
    const disturbanceY = this.rng.uniform(0, this.bounds.y);
    const disturbanceTheta = this.rng.gauss(0, this.params.thetaVariance);
    const disturbanceRadius = Math.abs(
      this.rng.gauss(
        this.params.disturbanceRadiusMean,
        this.params.disturbanceRadiusVariance,
      ),
    );
    const disturbanceHeading = this.rng.uniform(0, pi(2));
    const disturbanceSpeed = this.rng.uniform(
      this.params.disturbanceSpeedMin,
      this.params.disturbanceSpeedMax,
    );
    const disturbanceVel = new Vector(0, 0).fromAngle(
      disturbanceHeading,
      disturbanceSpeed,
    );
    this.disturbances.push({
      pos: new Vector(disturbanceX, disturbanceY),
      vel: disturbanceVel,
      theta: disturbanceTheta,
      radius: disturbanceRadius,
    });
  }

  computeFlowField() {
    // Reuse existing arrays, just reset values
    for (let i = 0; i < this.iMax; i++) {
      this.fieldPoints[i].fill(this.defaultTheta);
    }

    for (const { pos, theta, radius } of this.disturbances) {
      const minX = pos.x - radius;
      const maxX = pos.x + radius;
      const minY = pos.y - radius;
      const maxY = pos.y + radius;

      const minI = Math.max(0, Math.floor(minX / this.spacing));
      const maxI = Math.min(this.iMax, Math.ceil(maxX / this.spacing));
      const minJ = Math.max(0, Math.floor(minY / this.spacing));
      const maxJ = Math.min(this.jMax, Math.ceil(maxY / this.spacing));

      for (let i = minI; i < maxI; i++) {
        const x = this.spacing * i;
        for (let j = minJ; j < maxJ; j++) {
          const y = this.spacing * j;
          const dx = pos.x - x;
          const dy = pos.y - y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const thetaAdjust = d <= radius ? theta * (1 - d / radius) : 0;
          this.fieldPoints[i][j] += thetaAdjust;
        }
      }
    }
  }

  step() {
    for (const disturbance of this.disturbances) {
      disturbance.pos.add(disturbance.vel);
      if (!this.inBounds(disturbance.pos)) {
        disturbance.vel.mult(-1);
      }
    }
    this.computeFlowField();
  }

  /** Capture the dynamic field state at a simulation-step boundary. */
  captureState(): FlowFieldState {
    return {
      defaultTheta: this.defaultTheta,
      disturbances: this.disturbances.map(({ pos, vel, theta, radius }) => ({
        x: pos.x,
        y: pos.y,
        velocityX: vel.x,
        velocityY: vel.y,
        theta,
        radius,
      })),
    };
  }

  /** Restore a state produced by `captureState()` and rebuild the angle grid. */
  restoreState(state: FlowFieldState): void {
    const values = [
      state.defaultTheta,
      ...state.disturbances.flatMap((disturbance) => [
        disturbance.x,
        disturbance.y,
        disturbance.velocityX,
        disturbance.velocityY,
        disturbance.theta,
        disturbance.radius,
      ]),
    ];
    if (values.some((value) => !Number.isFinite(value))) {
      throw new Error("Flow-field state contains a non-finite value");
    }

    this.defaultTheta = state.defaultTheta;
    this.disturbances = state.disturbances.map((disturbance) => ({
      pos: new Vector(disturbance.x, disturbance.y),
      vel: new Vector(disturbance.velocityX, disturbance.velocityY),
      theta: disturbance.theta,
      radius: disturbance.radius,
    }));
    this.computeFlowField();
  }

  flow(x: number, y: number, magnitude: number, vectorToMutate: Vector): void {
    const i = Math.floor(x / this.spacing);
    const j = Math.floor(y / this.spacing);
    const theta = this.fieldPoints[i][j];
    vectorToMutate.fromAngle(theta, magnitude);
  }
}
