import p5 from "p5";

import { RenderContext } from "./renderContext";
import { Rng } from "./safeRandom";
import { FlowField } from "./flowField";
import { Mote } from "./mote";
import { detectCollisions } from "./collisions";

export class World {
  motes: Mote[];
  numMotes = 2000;
  xMin = 0;
  xMax = 1000;
  yMin = 0;
  yMax = 1000;
  moteRadius = 5;
  moteInfluenceRadius = 10;
  sectorSize = 50;
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
    const p = p5.Vector.fromAngle(theta, Math.sqrt(c) * 500);
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
    const mote = new Mote(this.randomPos(onCircumference), this.moteRadius);
    this.motes.push(mote);
  }

  // Steps through one time unit in the simulation
  step() {
    while (this.motes.length < this.numMotes) {
      this.addMote(true);
    }
    const ff = this.flowField;
    this.motes.forEach((mote) => mote.resetCollisions());
    const collidingMotes = detectCollisions(
      this.motes,
      this.moteInfluenceRadius,
      this.sectorSize
    );
    for (const [mote1, mote2] of collidingMotes) {
      mote1.collide(mote2, this.moteInfluenceRadius);
      mote2.collide(mote1, this.moteInfluenceRadius);
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
