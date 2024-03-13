import p5 from "p5";
import { RenderContext } from "./renderContext";
import { Spec } from "./spec";
import { rescale } from "./safeMath";

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
    hue = Math.min(hue, spec.moteMaxHue);
    let b = Math.min(1, this.age / 20);
    let size = spec.moteRadius * spec.moteRenderScale;
    let rotation = (this.age / 8) % (2 * Math.PI);
    let hsb = {
      hue: hue,
      sat: 100,
      bright: 80 + this.nCollisions * spec.moteBrightFactor,
    };
    rc.stroke(hsb.hue, hsb.sat, hsb.bright, b * 100);
    rc.spiralMote(this.pos.x, this.pos.y, size, rotation);
  }
}
