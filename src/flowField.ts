import p5 from "p5";
import { dist, rescale, pi } from "./safeMath";
import { Rng } from "./safeRandom";
import { Spec } from "./spec";

type DisturbanceSpec = {
  pos: p5.Vector;
  theta: number;
  radius: number;
};

type FlowSpec = {
  defaultTheta: number;
  disturbances: DisturbanceSpec[];
  bounds: p5.Vector;
};

export interface IFlowField {
  flow(pos: p5.Vector): p5.Vector;
}

export function flowSpec(r: Rng, spec: Spec, bounds: p5.Vector): FlowSpec {
  const { numDisturbances, thetaVariance, defaultTheta } = spec;
  const disturbances: DisturbanceSpec[] = [];
  for (let i = 0; i < numDisturbances; i++) {
    const disturbanceX = r.uniform(0, bounds.x);
    const disturbanceY = r.uniform(0, bounds.y);
    const disturbanceTheta = r.gauss(0, thetaVariance);
    const disturbanceRadius = Math.abs(
      r.gauss(spec.disturbanceRadiusMean, spec.disturbanceRadiusVariance)
    );
    disturbances.push({
      pos: new p5.Vector(disturbanceX, disturbanceY),
      theta: disturbanceTheta,
      radius: disturbanceRadius,
    });
  }
  return { defaultTheta, disturbances, bounds };
}

export class FlowField {
  spacing = 10;
  fieldPoints: number[][]; // Angle (theta) in a grid on the field

  constructor(spec: FlowSpec) {
    const iMax = Math.ceil(spec.bounds.x / this.spacing);
    const jMax = Math.ceil(spec.bounds.y / this.spacing);
    this.fieldPoints = Array.from({ length: iMax }, () =>
      Array(jMax).fill(spec.defaultTheta)
    );

    for (const { pos, theta, radius } of spec.disturbances) {
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
          const d = dist(pos.x, pos.y, x, y);
          const thetaAdjust = rescale(d, 0, radius, theta, 0);
          this.fieldPoints[i][j] += thetaAdjust;
        }
      }
    }
  }

  flow(pos: p5.Vector): p5.Vector {
    const i = Math.floor(pos.x / this.spacing);
    const j = Math.floor(pos.y / this.spacing);
    const theta = this.fieldPoints[i][j];
    return p5.Vector.fromAngle(theta);
  }
}

export class TestFlowField {
  center: p5.Vector;
  constructor(cx: number, cy: number) {
    this.center = new p5.Vector(cx, cy);
  }

  flow(pos: p5.Vector): p5.Vector {
    const toCenter = p5.Vector.sub(this.center, pos).normalize();
    const rotator = new p5.Vector(-toCenter.y, toCenter.x).div(2);
    const combined = toCenter.add(rotator);
    const dist = p5.Vector.dist(pos, this.center);
    if (dist < 1) {
      return combined.mult(dist);
    }
    return combined;
  }
}

type DynamicDisturbance = {
  pos: p5.Vector;
  vel: p5.Vector;
  theta: number;
  radius: number;
};

export class DynamicFlowField {
  spacing = 10;
  numDisturbances = 30;
  thetaVariance = 3.14;
  disturbanceRadiusMean = 100;
  disturbanceRadiusVariance = 200;
  defaultTheta: number;

  disturbances: DynamicDisturbance[] = [];
  bounds: p5.Vector;
  rng: Rng;

  fieldPoints: number[][]; // Angle (theta) in a grid on the field

  constructor(rng: Rng, bounds: p5.Vector) {
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

  inBounds(pos: p5.Vector) {
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
      p5.Vector.fromAngle(disturbanceHeading).mult(disturbanceSpeed);
    this.disturbances.push({
      pos: new p5.Vector(disturbanceX, disturbanceY),
      vel: disturbanceVel,
      theta: disturbanceTheta,
      radius: disturbanceRadius,
    });
  }

  computeFlowField() {
    const iMax = Math.ceil(this.bounds.x / this.spacing);
    const jMax = Math.ceil(this.bounds.y / this.spacing);
    this.fieldPoints = Array.from({ length: iMax }, () =>
      Array(jMax).fill(this.defaultTheta)
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
          const d = dist(pos.x, pos.y, x, y);
          const thetaAdjust = rescale(d, 0, radius, theta, 0);
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

  flow(pos: p5.Vector): p5.Vector {
    const i = Math.floor(pos.x / this.spacing);
    const j = Math.floor(pos.y / this.spacing);
    const theta = this.fieldPoints[i][j];
    return p5.Vector.fromAngle(theta);
  }
}
