import p5 from "p5";
import { Spec } from "./spec";

export class RenderContext {
  p5: p5;
  // data dimension of the square

  r: number;
  c: p5.Renderer;

  constructor(p5: p5, spec: Spec) {
    this.p5 = p5;

    this.r = p5.windowWidth / spec.xDim;
    p5.pixelDensity(1);
    p5.colorMode(p5.HSB, 360, 100, 100, 100);

    this.c = p5.createCanvas(spec.xDim * this.r, spec.yDim * this.r);
  }

  background(h: number, s: number, b: number) {
    this.p5.background(h, s, b);
  }

  stroke(h: number, s: number, b: number, a: number) {
    this.p5.stroke(h, s, b, a);
  }

  noStroke() {
    this.p5.noStroke();
  }

  circle(x: number, y: number, r: number) {
    // underlying api uses diameter not radius, converted here.
    this.p5.circle(x * this.r, y * this.r, 2 * r * this.r);
  }

  noFill() {
    this.p5.noFill();
  }

  strokeWeight(w: number) {
    this.p5.strokeWeight(w);
  }
}
