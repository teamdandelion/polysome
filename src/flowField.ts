import p5 from "p5";
import { dist, rescale, pi } from "./safeMath";
import { Rng } from "./safeRandom";

type DisturbanceSpec = {
  pos: p5.Vector;
  theta: number;
  radius: number;
};

type FlowSpec = {
  defaultTheta: number;
  disturbances: DisturbanceSpec[];
};

export function randomFlowSpec(r: Rng): FlowSpec {
  const numDisturbances = r.choice([20, 30, 50]);
  const thetaVariance = r.choice([0.1, 0.5, 1].map(pi));
  const disturbances: DisturbanceSpec[] = [];
  const defaultTheta = r.uniform(0, pi(2));
  for (let i = 0; i < numDisturbances; i++) {
    const disturbanceX = r.uniform(0, 1000);
    const disturbanceY = r.uniform(0, 1000);
    const disturbanceTheta = r.gauss(0, thetaVariance);
    const disturbanceRadius = Math.abs(r.gauss(100, 200));
    disturbances.push({
      pos: new p5.Vector(disturbanceX, disturbanceY),
      theta: disturbanceTheta,
      radius: disturbanceRadius,
    });
  }
  return { defaultTheta, disturbances };
}

export class FlowField {
  xMin = 0;
  xMax = 1000;
  yMin = 0;
  yMax = 1000;
  spacing = 10;
  fieldPoints: number[][]; // Angle (theta) in a grid on the field

  constructor(spec: FlowSpec) {
    const iMax = (this.xMax - this.xMin) / this.spacing;
    const jMax = (this.yMax - this.yMin) / this.spacing;
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
