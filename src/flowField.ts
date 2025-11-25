import { pi } from "./safeMath.ts";
import { Rng } from "./safeRandom.ts";
import { Spec } from "./spec.ts";
import { Vector } from "./vector.ts";

type FlowFieldDisturbance = {
  pos: Vector;
  vel: Vector;
  theta: number;
  radius: number;
};

export class FlowField {
  private spec: Spec;
  private spacing: number;
  private defaultTheta: number;

  disturbances: FlowFieldDisturbance[] = [];
  bounds: Vector;
  rng: Rng;

  fieldPoints: Float64Array[]; // Angle (theta) in a grid on the field
  private iMax: number; // Cache grid dimensions
  private jMax: number;

  constructor(rng: Rng, spec: Spec, bounds: Vector) {
    this.rng = rng;
    this.spec = spec;
    this.bounds = bounds;
    this.spacing = spec.flowFieldSpacing;
    this.defaultTheta = rng.uniform(0, pi(2));

    // Pre-allocate fieldPoints array once
    this.iMax = Math.ceil(bounds.x / this.spacing);
    this.jMax = Math.ceil(bounds.y / this.spacing);
    this.fieldPoints = Array.from(
      { length: this.iMax },
      () => new Float64Array(this.jMax)
    );

    this.disturbances = [];
    while (this.disturbances.length < spec.numDisturbances) {
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
    const disturbanceTheta = this.rng.gauss(0, this.spec.thetaVariance);
    const disturbanceRadius = Math.abs(
      this.rng.gauss(
        this.spec.disturbanceRadiusMean,
        this.spec.disturbanceRadiusVariance
      )
    );
    const disturbanceHeading = this.rng.uniform(0, pi(2));
    const disturbanceSpeed = this.rng.uniform(
      this.spec.disturbanceSpeedMin,
      this.spec.disturbanceSpeedMax
    );
    const disturbanceVel =
      Vector.fromAngle(disturbanceHeading).mult(disturbanceSpeed);
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

  flow(pos: Vector): Vector {
    const i = Math.floor(pos.x / this.spacing);
    const j = Math.floor(pos.y / this.spacing);
    const theta = this.fieldPoints[i][j];
    return Vector.fromAngle(theta);
  }
}
