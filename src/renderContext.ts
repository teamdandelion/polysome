import p5 from "p5";
import { Spec } from "./spec";

export class RenderContext {
  p5: p5;

  spec: Spec;

  r: number;
  c: p5.Renderer;

  // Ratio of how zoomed in we are. 1.1x zoom implies we are dropping
  // off the edges of the simulation to not render them.
  // We keep the center of the sim on the center of the screen (for now)
  zoom: number;
  // X-center of the zoomed viewport
  zoomX: number;
  // Y-center of the zoomed viewport
  zoomY: number;

  constructor(p5: p5, spec: Spec, bounds: p5.Vector, zoom: number) {
    this.p5 = p5;
    this.spec = spec;
    this.r = p5.windowWidth / bounds.x;
    this.zoom = zoom;
    this.zoomX = bounds.x / 2;
    this.zoomY = bounds.y / 2;
    p5.pixelDensity(1);
    p5.colorMode(p5.HSB, 360, 100, 100, 100);

    this.c = p5.createCanvas(p5.windowWidth, p5.windowHeight);
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

  convert(x: number, y: number) {
    const px = (x - this.zoomX) * this.zoom * this.r + this.p5.windowWidth / 2;
    const py = (y - this.zoomY) * this.zoom * this.r + this.p5.windowHeight / 2;
    return [px, py];
  }

  circle(x: number, y: number, r: number) {
    const [px, py] = this.convert(x, y);
    // underlying api uses diameter not radius, converted here.
    this.p5.circle(
      px,
      py,
      2 * r * this.r * this.zoom * this.spec.moteRenderScaling
    );
  }

  line(x1: number, y1: number, x2: number, y2: number) {
    const [px1, py1] = this.convert(x1, y1);
    const [px2, py2] = this.convert(x2, y2);
    this.p5.line(px1, py1, px2, py2);
  }

  rect(x1: number, y1: number, w: number, h: number) {
    const [px1, py1] = this.convert(x1, y1);
    this.p5.rect(px1, py1, w * this.r * this.zoom, h * this.r * this.zoom);
  }

  text(text: string, x: number, y: number) {
    const [px, py] = this.convert(x, y);
    this.p5.text(text, px, py);
  }

  noFill() {
    this.p5.noFill();
  }

  strokeWeight(w: number) {
    this.p5.strokeWeight(w);
  }
}
