import p5 from "p5";

import { Spec } from "./spec";
import { Mote } from "./mote";
import { RenderContext } from "./renderContext";

export type ForceCell = {
  pos: p5.Vector;
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
  iMax: number;
  jMax: number;

  constructor(spec: Spec, bounds: p5.Vector) {
    this.spec = spec;
    this.bounds = bounds;
    this.iMax = Math.ceil(bounds.x / spec.forceFieldResolution);
    this.jMax = Math.ceil(bounds.y / spec.forceFieldResolution);
    this.cells = [];
    for (let j = 0; j < this.jMax; j++) {
      for (let i = 0; i < this.iMax; i++) {
        const pos = new p5.Vector(
          i * spec.forceFieldResolution,
          j * spec.forceFieldResolution
        );
        this.cells.push({
          pos,
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
    let nForces = 0;
    let nMotes = 0;
    this.cells.forEach((cell) => {
      cell.force = new p5.Vector(0, 0);
      cell.numForces = 0;
      cell.aggregateMagnitude = 0;
    });
    const radiusSq = this.spec.moteRadius * this.spec.moteRadius;
    motes.forEach((mote) => {
      nMotes++;
      let cellsThisMote = 0;
      let triesThisMote = 0;
      if (
        mote.pos.x >= this.bounds.x ||
        mote.pos.y >= this.bounds.y ||
        mote.pos.x < 0 ||
        mote.pos.y < 0
      ) {
        throw new Error("Position out of bounds");
      }
      const iMin = Math.floor(
        (mote.pos.x - this.spec.moteRadius) / this.spec.forceFieldResolution
      );
      const iMax = Math.ceil(
        (mote.pos.x + this.spec.moteRadius) / this.spec.forceFieldResolution
      );
      const jMin = Math.floor(
        (mote.pos.y - this.spec.moteRadius) / this.spec.forceFieldResolution
      );
      const jMax = Math.ceil(
        (mote.pos.y + this.spec.moteRadius) / this.spec.forceFieldResolution
      );
      for (let j = jMin; j <= jMax; j++) {
        for (let i = iMin; i <= iMax; i++) {
          if (i < 0 || j < 0 || i >= this.iMax || j >= this.jMax) {
            continue;
          }
          const cell = this.cellForIndex(i, j);
          triesThisMote++;

          const v = p5.Vector.sub(cell.pos, mote.pos);
          const d = v.mag();
          if (d > this.spec.moteRadius) {
            continue;
          }
          nForces++;
          cellsThisMote++;
          let forceFactor = this.spec.moteForce;
          if (d >= this.spec.moteRadius - this.spec.moteCollisionDecay) {
            forceFactor *=
              (this.spec.moteRadius - d) / this.spec.moteCollisionDecay;
          }
          v.setMag(forceFactor);

          cell.force.add(v);
          cell.numForces++;
          cell.aggregateMagnitude += forceFactor;
        }
      }
    });
  }

  approximateForceAt(pos: p5.Vector): { f: p5.Vector; nCollisions: number } {
    const xi = Math.floor(pos.x / this.spec.forceFieldResolution);
    const yj = Math.floor(pos.y / this.spec.forceFieldResolution);
    const i0 = Math.floor(xi);
    const i1 = Math.ceil(xi);
    const j0 = Math.floor(yj);
    const j1 = Math.ceil(yj);

    const cell00 = this.cellForIndex(i0, j0);
    const cell10 = this.cellForIndex(i1, j0);
    const cell01 = this.cellForIndex(i0, j1);
    const cell11 = this.cellForIndex(i1, j1);
    // Interpolate along x for the two sets of y values
    const f0 = p5.Vector.lerp(cell00.force, cell10.force, xi - i0);
    const f1 = p5.Vector.lerp(cell01.force, cell11.force, xi - i0);

    // Interpolate the above results along y
    const f = p5.Vector.lerp(f0, f1, yj - j0);
    const nCollisions =
      (cell00.numForces +
        cell10.numForces +
        cell01.numForces +
        cell11.numForces) /
      4;

    return { f, nCollisions };
  }

  cellForIndex(i: number, j: number): ForceCell {
    if (i >= this.iMax || j >= this.jMax || i < 0 || j < 0) {
      throw new Error("Index out of bounds");
    }
    const cell = this.cells[j * this.iMax + i];
    if (cell.i !== i || cell.j !== j) {
      throw new Error("cell index mismatch");
    }
    return cell;
  }

  render(rc: RenderContext) {
    for (const cell of this.cells) {
      const hue = 30 + cell.numForces * this.spec.moteHueFactor;
      rc.stroke(hue, 100, 100, 20);
      rc.noFill();
      rc.rect(
        cell.pos.x - this.spec.forceFieldResolution / 2,
        cell.pos.y - this.spec.forceFieldResolution / 2,
        this.spec.forceFieldResolution,
        this.spec.forceFieldResolution
      );
    }
  }
}
