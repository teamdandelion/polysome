import p5 from "p5";

import { Spec } from "./spec";
import { Mote } from "./mote";
import { RenderContext } from "./renderContext";

export type ForceCell = {
  min: p5.Vector;
  max: p5.Vector;
  i: number;
  j: number;
  force: p5.Vector;
  aggregateMagnitude: number;
  numForces: number;
};

export class ForceField {
  spec: Spec;
  bounds: p5.Vector;
  cells: ForceCell[];

  constructor(spec: Spec, bounds: p5.Vector) {
    this.spec = spec;
    this.bounds = bounds;
    const iMax = Math.ceil(bounds.x / spec.forceFieldResolution);
    const jMax = Math.ceil(bounds.y / spec.forceFieldResolution);
    this.cells = [];
    for (let j = 0; j < jMax; j++) {
      for (let i = 0; i < iMax; i++) {
        const min = new p5.Vector(
          i * spec.forceFieldResolution,
          j * spec.forceFieldResolution
        );
        const max = new p5.Vector(
          (i + 1) * spec.forceFieldResolution,
          (j + 1) * spec.forceFieldResolution
        );
        this.cells.push({
          min,
          max,
          i,
          j,
          force: new p5.Vector(0, 0),
          aggregateMagnitude: 0,
          numForces: 0,
        });
      }
    }
  }

  setMotes(motes: Mote[]) {
    // Do nothing
  }

  render(rc: RenderContext) {
    for (const cell of this.cells) {
      const hue = 120;
      rc.stroke(hue, 100, 100, 3);
      rc.noFill();
      rc.rect(
        cell.min.x,
        cell.min.y,
        this.spec.forceFieldResolution,
        this.spec.forceFieldResolution
      );
    }
  }
}
