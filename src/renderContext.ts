import p5 from "p5";
import { Spec } from "./spec";
import { pi, rescale } from "./safeMath";
import { Rng } from "./safeRandom";

export class RenderContext {
  p5: p5;
  spec: Spec;
  bounds: p5.Vector;
  r: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // Ratio of how zoomed in we are. 1.1x zoom implies we are dropping
  // off the edges of the simulation to not render them.
  // We keep the center of the sim on the center of the screen (for now)
  zoom: number;
  // X-center of the zoomed viewport
  zoomX: number;
  // Y-center of the zoomed viewport
  zoomY: number;

  R: Rng;

  constructor(p5: p5, spec: Spec, bounds: p5.Vector, zoom: number, R: Rng) {
    this.p5 = p5;
    this.spec = spec;
    this.bounds = bounds;
    this.r = p5.windowWidth / bounds.x;
    this.zoom = zoom;
    this.zoomX = bounds.x / 2;
    this.zoomY = bounds.y / 2;
    p5.pixelDensity(1);
    p5.colorMode(p5.HSB, 360, 100, 100, 100);

    this.canvas = p5.createCanvas(p5.windowWidth, p5.windowHeight)
      .elt as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.R = R;
  }

  background(h: number, s: number, b: number) {
    const color = this.p5.color(h, s, b);
    this.ctx.fillStyle = color.toString();
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  stroke(h: number, s: number, b: number, a: number) {
    const color = this.p5.color(h, s, b, a);
    this.ctx.strokeStyle = color.toString();
  }

  vrtx(x: number, y: number) {
    const [px, py] = this.convert(x, y);
    this.p5.vertex(px, py);
  }

  w(p: number) {
    return p * this.bounds.x;
  }

  sWeight(v: number) {
    this.ctx.lineWidth = v * this.zoom * this.r;
  }

  noStroke() {
    this.ctx.strokeStyle = "transparent";
  }

  convert(x: number, y: number) {
    const px = (x - this.zoomX) * this.zoom * this.r + this.p5.windowWidth / 2;
    const py = (y - this.zoomY) * this.zoom * this.r + this.p5.windowHeight / 2;
    return [px, py];
  }

  circle(x: number, y: number, r: number) {
    const [px, py] = this.convert(x, y);
    const diameter = 2 * r * this.r * this.zoom;
    this.ctx.beginPath();
    this.ctx.arc(px, py, diameter / 2, 0, 2 * Math.PI);
    this.ctx.stroke();
    this.ctx.fill();
  }

  ellipse(x: number, y: number, w: number, h: number) {
    const [px, py] = this.convert(x, y);
    const width = 2 * w * this.r * this.zoom;
    const height = 2 * h * this.r * this.zoom;
    this.ctx.beginPath();
    this.ctx.ellipse(px, py, width / 2, height / 2, 0, 0, 2 * Math.PI);
    this.ctx.stroke();
    this.ctx.fill();
  }

  line(x1: number, y1: number, x2: number, y2: number) {
    const [px1, py1] = this.convert(x1, y1);
    const [px2, py2] = this.convert(x2, y2);
    this.ctx.beginPath();
    this.ctx.moveTo(px1, py1);
    this.ctx.lineTo(px2, py2);
    this.ctx.stroke();
  }

  rect(x1: number, y1: number, w: number, h: number) {
    const [px1, py1] = this.convert(x1, y1);
    this.ctx.beginPath();
    this.ctx.rect(px1, py1, w * this.r * this.zoom, h * this.r * this.zoom);
    this.ctx.stroke();
    this.ctx.fill();
  }

  text(text: string, x: number, y: number) {
    const [px, py] = this.convert(x, y);
    this.ctx.fillText(text, px, py);
  }

  noFill() {
    this.ctx.fillStyle = "transparent";
  }

  strokeWeight(w: number) {
    this.ctx.lineWidth = w * this.zoom * this.r;
  }
}

interface HSB {
  hue: number;
  sat: number;
  bright: number;
}
