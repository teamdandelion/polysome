import p5 from "p5";

import { Rng } from "./safeRandom";

export class World {
  nutrients: Mote[];
  numNutrients = 1000;
  xMin = 0;
  xMax = 1000;
  yMin = 0;
  yMax = 1000;
  rng: Rng;

  constructor(rng: Rng) {
    this.nutrients = [];
    this.rng = rng;
  }

  randomPos(): p5.Vector {
    // Compute a random point on a circle of radius 500, centered on 500, 500
    const theta = this.rng.rnd() * 2 * Math.PI;
    const p = p5.Vector.fromAngle(theta, 500);
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

  // Adds a nutrient to the world
  addNutrient() {
    const mote = new Mote(this.randomPos(), new p5.Vector(2, 1));
    this.nutrients.push(mote);
  }

  // Steps through one time unit in the simulation
  step() {
    while (this.nutrients.length < this.numNutrients) {
      this.addNutrient();
    }
    this.nutrients.forEach((nutrient) => nutrient.move());
    this.nutrients = this.nutrients.filter((nutrient) =>
      this.inBounds(nutrient.pos)
    );
  }

  render() {
    this.nutrients.forEach((nutrient) => {});
  }
}

export class Mote {
  pos: p5.Vector;
  vel: p5.Vector;

  constructor(pos: p5.Vector, vel: p5.Vector) {
    this.pos = pos;
    this.vel = vel;
  }

  move() {
    this.pos.add(this.vel);
  }
}
