import p5 from "p5";
import { RenderContext } from "./renderContext";

export class Mote {
  pos: p5.Vector;
  // aggregate collision force vector
  vCollide: p5.Vector;
  nCollisions = 0;

  constructor(pos: p5.Vector) {
    this.pos = pos;
    this.vCollide = new p5.Vector(0, 0);
  }

  resetCollisions() {
    this.vCollide = new p5.Vector(0, 0);
    this.nCollisions = 0;
  }
}
