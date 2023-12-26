import p5 from "p5";

export class RenderContext {
  p5: p5;
  // data dimension of the square
  dd: number;
  // pixel dimension of the square
  pd: number;
  // ratio of pixel dimension to data dimension
  r: number;
  c: p5.Renderer;

  constructor(p5: p5, dd: number) {
    this.p5 = p5;
    this.dd = dd;
    this.pd = Math.min(p5.windowWidth, p5.windowHeight);
    this.r = this.pd / this.dd; // ratio to window
    p5.pixelDensity(1);
    p5.colorMode(p5.HSB, 360, 100, 100, 100);

    this.c = p5.createCanvas(this.pd, this.pd);
  }

  resize() {
    this.pd = Math.min(this.p5.windowWidth, this.p5.windowHeight);
    this.p5.resizeCanvas(this.pd, this.pd);
    this.r = this.pd / this.dd; // ratio to window
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
