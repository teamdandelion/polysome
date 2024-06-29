import p5 from "p5";
import { RenderContext } from "./renderContext";
import { Spec } from "./spec";
import { rescale } from "./safeMath";
import { Rng } from "./safeRandom";

interface RingRenderSpec {
  sizeFactor: number;
  thickness: number;
  opacity: number;
  xOffset: number;
  yOffset: number;
  wFactor: number;
  hFactor: number;
}

export class Mote {
  pos: p5.Vector;
  R: Rng;
  spec: Spec;
  // aggregate collision force vector
  vCollide: p5.Vector;
  nCollisions = 0;
  age = 0;
  isDebugMote = false;

  ringRenderSpecs: RingRenderSpec[];

  constructor(pos: p5.Vector, R: Rng, spec: Spec) {
    this.pos = pos;
    this.R = R;
    this.spec = spec;
    this.vCollide = new p5.Vector(0, 0);
    this.ringRenderSpecs = [];
    let numRings = this.R.choice([1, 1, 2, 2, 3, 5]);
    for (let i = 0; i < numRings; i++) {
      this.ringRenderSpecs.push({
        sizeFactor: this.R.gauss(1, 0.4),
        thickness: this.R.gauss(0.7, 0.3),
        opacity: Math.min(this.R.gauss(0.9, 0.2), 1),
        xOffset: this.R.gauss(0, 0.2),
        yOffset: this.R.gauss(0, 0.2),
        wFactor: this.R.gauss(1, 0.08),
        hFactor: this.R.gauss(1, 0.08),
      });
    }
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
    for (let i = 0; i < this.ringRenderSpecs.length; i++) {
      let {
        opacity,
        thickness,
        xOffset,
        yOffset,
        sizeFactor,
        wFactor,
        hFactor,
      } = this.ringRenderSpecs[i];
      rc.stroke(hsb.hue, hsb.sat, hsb.bright, b * 100 * opacity);
      rc.sWeight(thickness);
      let w = size * sizeFactor * wFactor;
      let h = size * sizeFactor * hFactor;

      rc.ellipse(this.pos.x + xOffset, this.pos.y + yOffset, w, h);
    }

    if (this.isDebugMote) {
      rc.stroke(0, 0, 100, 100);
      rc.sWeight(1);
      rc.ellipse(this.pos.x, this.pos.y, 10, 10);
    }
  }
}
