import p5 from "p5";
import { RenderContext } from "./renderContext";
import { Spec } from "./spec";
import { rescale } from "./safeMath";
import { Rng } from "./safeRandom";

export class Mote {
  pos: p5.Vector;
  R: Rng;
  spec: Spec;
  // aggregate collision force vector
  vCollide: p5.Vector;
  nCollisions = 0;
  age = 0;

  constructor(pos: p5.Vector, R: Rng, spec: Spec) {
    this.pos = pos;
    this.R = R;
    this.spec = spec;
    this.vCollide = new p5.Vector(0, 0);
  }

  resetCollisions() {
    this.vCollide = new p5.Vector(0, 0);
    this.nCollisions = 0;
    this.age++;
  }

  render(rc: RenderContext) {
    let hue =
      this.spec.moteHueBaseline + this.nCollisions * this.spec.moteHueFactor;
    hue = Math.min(hue, this.spec.moteMaxHue);
    let b = Math.min(1, this.age / 20);
    let size = this.spec.moteRadius * this.spec.moteRenderScale; // + this.nCollisions / 6;
    let rotation = (this.age / 10) % (2 * Math.PI);
    let hsb = {
      hue: hue,
      sat: 100,
      bright: 80 + this.nCollisions * this.spec.moteBrightFactor,
    };
    rc.stroke(hsb.hue, hsb.sat, hsb.bright, b * 100);
    rc.circle(this.pos.x, this.pos.y, size);
    // too messy right now rc.drawMessyCircle(this.pos.x, this.pos.y, size, 10, 4);
  }
}
