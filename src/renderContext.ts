import { Spec } from "./spec.ts";
import { Vector } from "./vector.ts";
import { Rng } from "./safeRandom.ts";
import { hsbToRgb } from "./colorUtils.ts";

export class RenderContext {
  spec: Spec;
  bounds: Vector;
  r: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;

  // Ratio of how zoomed in we are. 1.1x zoom implies we are dropping
  // off the edges of the simulation to not render them.
  // We keep the center of the sim on the center of the screen (for now)
  zoom: number;
  // X-center of the zoomed viewport
  zoomX: number;
  // Y-center of the zoomed viewport
  zoomY: number;

  R: Rng;

  constructor(
    canvas: HTMLCanvasElement,
    spec: Spec,
    bounds: Vector,
    zoom: number,
    R: Rng
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    this.spec = spec;
    this.bounds = bounds;
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.r = this.canvasWidth / bounds.x;
    this.zoom = zoom;
    this.zoomX = bounds.x / 2;
    this.zoomY = bounds.y / 2;
    this.R = R;
  }

  background(h: number, s: number, b: number) {
    this.ctx.fillStyle = hsbToRgb(h, s, b);
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  stroke(h: number, s: number, b: number, a: number = 100) {
    this.ctx.strokeStyle = hsbToRgb(h, s, b, a);
  }

  fill(h: number, s: number, b: number, a: number = 100) {
    this.ctx.fillStyle = hsbToRgb(h, s, b, a);
  }

  textSize(s: number) {
    this.ctx.font = `${s}px sans-serif`;
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
    const px = (x - this.zoomX) * this.zoom * this.r + this.canvasWidth / 2;
    const py = (y - this.zoomY) * this.zoom * this.r + this.canvasHeight / 2;
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
