import p5 from "p5";
import { RenderContext } from "./renderContext";
import { Spec } from "./spec";

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

  render(rc: RenderContext, spec: Spec) {
    let hue = spec.moteHueBaseline + this.nCollisions * spec.moteHueFactor;
    let b = Math.min(1, this.age / 20);
    rc.stroke(hue, 100, 40 + this.nCollisions * spec.moteBrightFactor, b * 80);
    rc.circle(this.pos.x, this.pos.y, spec.moteRadius * spec.moteRenderScale);
  }
}
