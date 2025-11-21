import { pi } from "./safeMath.js";
import { Rng } from "./safeRandom.js";
import { Vector } from "./vector.js";

type FlowFieldDisturbance = {
  pos: Vector;
  vel: Vector;
  theta: number;
  radius: number;
};

export class FlowField {
  spacing = 4;
  numDisturbances = 30;
  thetaVariance = 3.14;
  disturbanceRadiusMean = 100;
  disturbanceRadiusVariance = 200;
  defaultTheta: number;

  disturbances: FlowFieldDisturbance[] = [];
  bounds: Vector;
  rng: Rng;

  fieldPoints: Float64Array[]; // Angle (theta) in a grid on the field

  constructor(rng: Rng, bounds: Vector) {
    this.rng = rng;
    this.bounds = bounds;
    this.defaultTheta = rng.uniform(0, pi(2));

    this.fieldPoints = [];
    this.disturbances = [];
    while (this.disturbances.length < this.numDisturbances) {
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
    const disturbanceTheta = this.rng.gauss(0, this.thetaVariance);
    const disturbanceRadius = Math.abs(
      this.rng.gauss(this.disturbanceRadiusMean, this.disturbanceRadiusVariance)
    );
    const disturbanceHeading = this.rng.uniform(0, pi(2));
    const disturbanceSpeed = this.rng.uniform(0, 0.5);
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
    const iMax = Math.ceil(this.bounds.x / this.spacing);
    const jMax = Math.ceil(this.bounds.y / this.spacing);
    this.fieldPoints = Array.from({ length: iMax }, () =>
      new Float64Array(jMax).fill(this.defaultTheta)
    );

    for (const { pos, theta, radius } of this.disturbances) {
      const minX = pos.x - radius;
      const maxX = pos.x + radius;
      const minY = pos.y - radius;
      const maxY = pos.y + radius;

      const minI = Math.max(0, Math.floor(minX / this.spacing));
      const maxI = Math.min(iMax, Math.ceil(maxX / this.spacing));
      const minJ = Math.max(0, Math.floor(minY / this.spacing));
      const maxJ = Math.min(jMax, Math.ceil(maxY / this.spacing));

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
