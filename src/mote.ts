import p5 from "p5";
import { RenderContext } from "./renderContext";

export class Mote {
  pos: p5.Vector;
  // aggregate collision force vector
  vCollide: p5.Vector;
  nCollisions = 0;
  age = 0;

  constructor(pos: p5.Vector) {
    this.pos = pos;
    this.vCollide = new p5.Vector(0, 0);
  }

  resetCollisions() {
    this.vCollide = new p5.Vector(0, 0);
    this.nCollisions = 0;
    this.age++;
  }

  render(rc: RenderContext, radius: number) {
    let hue = 30 + this.nCollisions * 3;
    let b = Math.min(1, this.age / 20);
    rc.stroke(hue, 100, 40 + this.nCollisions, b * 80);
    rc.circle(this.pos.x, this.pos.y, radius);
  }
}
