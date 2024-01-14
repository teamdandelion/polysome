import p5 from "p5";

import { RenderContext } from "./renderContext";
import { Rng } from "./safeRandom";
import { FlowField, IFlowField } from "./flowField";
import { Mote } from "./mote";
import { Spec } from "./spec";
import { SectorTracker } from "./sectors";

export class World {
  motes: Mote[];
  spec: Spec;
  rng: Rng;
  flowField: IFlowField;
  bounds: p5.Vector;
  sectorTracker: SectorTracker;

  constructor(spec: Spec, rng: Rng, flowField: IFlowField, bounds: p5.Vector) {
    this.spec = spec;
    this.motes = [];
    this.rng = rng;
    this.flowField = flowField;
    this.bounds = bounds;
    this.sectorTracker = new SectorTracker(spec.sectorSize, bounds);
  }

  randomPos(): p5.Vector {
    const spec = this.spec;
    return new p5.Vector(
      this.rng.uniform(0, this.bounds.x),
      this.rng.uniform(0, this.bounds.y)
    );
  }

  inBounds(pos: p5.Vector) {
    return (
      pos.x >= 0 &&
      pos.x <= this.bounds.x &&
      pos.y >= 0 &&
      pos.y <= this.bounds.y
    );
  }

  // Adds a mote to the world
  addMote() {
    const mote = new Mote(this.randomPos());
    this.motes.push(mote);
  }

  // Steps through one time unit in the simulation
  step() {
    let added = 0;
    while (
      this.motes.length < this.spec.numMotes &&
      added < this.spec.motesPerStep
    ) {
      this.addMote();
      added++;
    }

    const ff = this.flowField;
    this.motes.forEach((mote) => mote.resetCollisions());
    this.sectorTracker.updatePositions(this.motes);
    const collisionRadius =
      this.spec.moteRadius * 2 + this.spec.moteInfluenceRadius;
    const collisions = this.sectorTracker.collisions(collisionRadius);
    for (const { a, b, d, v } of collisions) {
      const boundaryDistance = d - 2 * this.spec.moteRadius;
      let forceFactor;
      if (boundaryDistance < 0) {
        forceFactor = 0.2;
      } else {
        forceFactor =
          (0.2 * (this.spec.moteInfluenceRadius - boundaryDistance)) /
          this.spec.moteInfluenceRadius;
      }
      v.setMag(forceFactor);
      a.vCollide.sub(v);
      b.vCollide.add(v);
      a.nCollisions++;
      b.nCollisions++;
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
      let hue = 30 + mote.nCollisions * 3;
      rc.stroke(hue, 100, 40 + mote.nCollisions, 80);
      rc.circle(mote.pos.x, mote.pos.y, this.spec.moteRadius);
    });
    this.sectorTracker.render(rc, true);
  }
}
