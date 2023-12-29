import p5 from "p5";
import { RenderContext } from "./renderContext";

export class Mote {
  pos: p5.Vector;
  // aggregate collision force vector
  vCollide: p5.Vector;
  radius: number;
  nCollisions = 0;

  constructor(pos: p5.Vector, radius: number) {
    this.pos = pos;
    this.vCollide = new p5.Vector(0, 0);
    this.radius = radius;
  }

  resetCollisions() {
    this.vCollide = new p5.Vector(0, 0);
    this.nCollisions = 0;
  }
}
