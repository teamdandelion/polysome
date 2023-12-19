import p5 from "p5";

import { Rng } from "./safeRandom";
import { FlowField } from "./flowField";
import { Mote } from "./mote";
import { collisions } from "./collisionDetector";

export class World {
  motes: Mote[];
  numMotes = 2000;
  xMin = 0;
  xMax = 1000;
  yMin = 0;
  yMax = 1000;
  rng: Rng;
  flowField: FlowField;

  constructor(rng: Rng, flowField: FlowField) {
    this.motes = [];
    this.rng = rng;
    this.flowField = flowField;
    while (this.motes.length < this.numMotes) {
      this.addMote(false);
    }
  }

  randomPos(onCircumference: boolean): p5.Vector {
    // Compute a random point either on or in
    // circle of radius 500, centered on 500, 500
    const theta = this.rng.rnd() * 2 * Math.PI;
    const c = onCircumference ? 1 : this.rng.rnd();
    const p = p5.Vector.fromAngle(theta, c * 500);
    return p.add(500, 500);
  }

  inBounds(pos: p5.Vector) {
    return (
      pos.x >= this.xMin &&
      pos.x <= this.xMax &&
      pos.y >= this.yMin &&
      pos.y <= this.yMax
    );
  }

  // Adds a mote to the world
  addMote(onCircumference: boolean) {
    const mote = new Mote(this.randomPos(onCircumference));
    this.motes.push(mote);
  }

  // Steps through one time unit in the simulation
  step() {
    while (this.motes.length < this.numMotes) {
      this.addMote(true);
    }
    const ff = this.flowField;
    this.motes.forEach((mote) => mote.resetCollisions());
    collisions(this.motes);

    this.motes.forEach((mote) => {
      const vel = ff.flow(mote.pos);
      mote.pos.add(vel);
      mote.pos.add(mote.vCollide);
    });

    this.motes = this.motes.filter(
      (mote) => this.inBounds(mote.pos) && mote.alive
    );
  }

  render(p5: p5, convertCoordinate: (v: p5.Vector) => p5.Vector) {
    p5.background(240, 100, 10);
    p5.fill(30, 100, 100, 100);
    this.motes.forEach((mote) => mote.render(p5, convertCoordinate));
  }
}
