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
      this.rng.uniform(spec.xMin, spec.xMax),
      this.rng.uniform(spec.yMin, spec.yMax)
    );
  }

  inBounds(pos: p5.Vector) {
    return (
      pos.x >= this.spec.xMin &&
      pos.x <= this.spec.xMax &&
      pos.y >= this.spec.yMin &&
      pos.y <= this.spec.yMax
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
      this.spec.sectorSize
    );
    for (const [mote1, mote2] of collidingMotes) {
      mote1.collide(mote2, this.spec.moteInfluenceRadius);
      mote2.collide(mote1, this.spec.moteInfluenceRadius);
    }

    this.motes.forEach((mote) => {
      const vel = ff.flow(mote.pos);
      mote.pos.add(vel);
      mote.pos.add(mote.vCollide);
    });

    this.motes = this.motes.filter(
      (mote) => this.inBounds(mote.pos) && mote.alive
    );
  }

  render(rc: RenderContext) {
    rc.background(240, 100, 10);
    this.motes.forEach((mote) => mote.render(rc));
  }
}
