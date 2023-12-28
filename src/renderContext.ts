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

  constructor(p5: p5, spec: Spec, zoom: number) {
    this.p5 = p5;
    this.spec = spec;
    this.r = p5.windowWidth / spec.xDim;
    this.zoom = zoom;
    this.zoomX = spec.xDim / 2;
    this.zoomY = spec.yDim / 2;
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

  circle(x: number, y: number, r: number) {
    const px = (x - this.zoomX) * this.zoom * this.r + this.p5.windowWidth / 2;
    const py = (y - this.zoomY) * this.zoom * this.r + this.p5.windowHeight / 2;
    // underlying api uses diameter not radius, converted here.
    this.p5.circle(
      px,
      py,
      2 * r * this.r * this.zoom * this.spec.moteRenderScaling
    );
  }

  noFill() {
    this.p5.noFill();
  }

  strokeWeight(w: number) {
    this.p5.strokeWeight(w);
  }
}
