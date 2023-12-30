import p5 from "p5";

import { RenderContext } from "./renderContext";
import { Rng } from "./safeRandom";
import { FlowField } from "./flowField";
import { Mote } from "./mote";
import { Spec } from "./spec";
import { detectCollisions } from "./collisions";

export class World {
  motes: Mote[];
  spec: Spec;
  rng: Rng;
  flowField: FlowField;

  constructor(spec: Spec, rng: Rng, flowField: FlowField) {
    this.spec = spec;
    this.motes = [];
    this.rng = rng;
    this.flowField = flowField;
    while (this.motes.length < this.spec.numMotes) {
      this.addMote();
    }
  }

  randomPos(): p5.Vector {
    const spec = this.spec;
    return new p5.Vector(
      this.rng.uniform(0, spec.xDim),
      this.rng.uniform(0, spec.yDim)
    );
  }

  inBounds(pos: p5.Vector) {
    return (
      pos.x >= 0 &&
      pos.x <= this.spec.xDim &&
      pos.y >= 0 &&
      pos.y <= this.spec.yDim
    );
  }

  // Adds a mote to the world
  addMote() {
    const mote = new Mote(this.randomPos(), this.spec.moteRadius);
    this.motes.push(mote);
  }

  // Steps through one time unit in the simulation
  step() {
    while (this.motes.length < this.spec.numMotes) {
      this.addMote();
    }

    const ff = this.flowField;
    this.motes.forEach((mote) => mote.resetCollisions());
    const collidingMotes = detectCollisions(
      this.motes,
      this.spec.moteInfluenceRadius,
      this.spec.sectorSize,
      Math.max(this.spec.xDim, this.spec.yDim)
    );
    for (const [mote1, mote2] of collidingMotes) {
      const v = p5.Vector.sub(mote1.pos, mote2.pos);
      const d = v.mag();
      const boundaryDistance = d - mote1.radius - mote2.radius;
      let forceFactor;
      if (boundaryDistance < 0) {
        forceFactor = 0.2;
      } else {
        forceFactor =
          (0.2 * (this.spec.moteInfluenceRadius - boundaryDistance)) /
          this.spec.moteInfluenceRadius;
      }
      v.setMag(forceFactor);
      mote1.vCollide.add(v);
      mote2.vCollide.sub(v);
      mote1.nCollisions++;
      mote2.nCollisions++;
    }

    this.motes.forEach((mote) => {
      const vel = ff.flow(mote.pos).mult(this.spec.flowCoefficient);
      mote.pos.add(
        vel.mult(Math.pow(this.spec.cxFlowCoefficient, mote.nCollisions))
      );
      mote.pos.add(mote.vCollide);
    });

    this.motes = this.motes.filter((mote) => this.inBounds(mote.pos));
  }

  render(rc: RenderContext) {
    rc.background(240, 100, 10);
    rc.strokeWeight(2);
    rc.noFill();

    this.motes.forEach((mote) => {
      let hue = 30 + mote.nCollisions * 4;
      rc.stroke(hue, 100, 40 + mote.nCollisions, 80);
      rc.circle(mote.pos.x, mote.pos.y, mote.radius);
    });
  }
}
