import p5 from "p5";
import { Spec } from "./spec";
import { pi, rescale } from "./safeMath";
import { Rng } from "./safeRandom";

export class RenderContext {
  p5: p5;

  spec: Spec;

  bounds: p5.Vector;
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

    this.c = p5.createCanvas(p5.windowWidth, p5.windowHeight);
    this.R = R;
  }

  background(h: number, s: number, b: number) {
    this.p5.background(h, s, b);
  }

  stroke(h: number, s: number, b: number, a: number) {
    this.p5.stroke(h, s, b, a);
  }

  vrtx(x: number, y: number) {
    const [px, py] = this.convert(x, y);
    this.p5.vertex(px, py);
  }

  w(p: number) {
    return p * this.bounds.x;
  }

  sWeight(v: number) {
    this.p5.strokeWeight(v * this.zoom * this.r);
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
    this.p5.circle(px, py, 2 * r * this.r * this.zoom);
  }

  ellipse(x: number, y: number, w: number, h: number) {
    const [px, py] = this.convert(x, y);
    // underlying api uses diameter not radius, converted here.
    this.p5.ellipse(
      px,
      py,
      2 * w * this.r * this.zoom,
      2 * h * this.r * this.zoom
    );
  }

  drawCleanCircle(
    x: number,
    y: number,
    radius: number,
    thickness: number,
    ellipticalVariation: number
  ) {
    const drawRadius = Math.max(this.w(0.0002), radius - thickness * 0.5);
    this.sWeight(thickness * 0.95);

    const variance = Math.min(this.w(0.0015), drawRadius * ellipticalVariation);
    const horizontalRadius = this.R.gauss(drawRadius, variance);
    const verticalRadius = this.R.gauss(drawRadius, variance);

    const startingTheta = this.R.uniform(0.0, pi(2.0));
    const numSteps = 32;
    const step = pi(2.0) / numSteps;

    this.p5.beginShape();
    for (let theta = 0; theta < pi(2.0); theta += step) {
      const finalX = x + horizontalRadius * Math.cos(theta);
      const finalY = y + verticalRadius * Math.sin(theta);
      this.vrtx(finalX, finalY);
    }
    this.p5.endShape(this.p5.CLOSE);
  }

  drawMessyCircle(
    x: number,
    y: number,
    radius: number,
    thickness: number,
    varianceAdjust: number
  ) {
    let numRounds = 3;

    for (let i = 0; i < numRounds; i++) {
      const r = rescale(i, 0, numRounds, radius, radius - thickness);
      const varianceRatio =
        varianceAdjust *
        rescale(thickness, this.w(0.001), this.w(0.04), 0.08, 0.03);

      let positionVariance =
        varianceAdjust * Math.min(this.w(0.0015), thickness * varianceRatio);
      let thicknessVarianceMultiplier = 1.0;
      if (i < 5) {
        positionVariance *= 1.5;
        thicknessVarianceMultiplier = 2.0;
      }
      const finalX = this.R.gauss(x, positionVariance);
      const finalY = this.R.gauss(y, positionVariance);

      let meanSingleLineThickness;
      if (thickness > this.w(0.02)) {
        meanSingleLineThickness = rescale(
          thickness,
          this.w(0.02),
          this.w(0.04),
          this.w(0.0007),
          this.w(0.00073)
        );
      } else if (thickness > this.w(0.006)) {
        meanSingleLineThickness = rescale(
          thickness,
          this.w(0.006),
          this.w(0.02),
          this.w(0.0005),
          this.w(0.0007)
        );
      } else {
        meanSingleLineThickness = rescale(
          thickness,
          this.w(0.001),
          this.w(0.006),
          this.w(0.0001),
          this.w(0.0005)
        );
      }

      let thicknessVarianceFactor =
        thicknessVarianceMultiplier *
        rescale(thickness, this.w(0.001), this.w(0.04), 0.25, 1.1);
      let singleLineVariance =
        meanSingleLineThickness * thicknessVarianceFactor;
      if (r < this.w(0.002)) {
        singleLineVariance = meanSingleLineThickness * 0.1;
      }
      const thick = Math.max(
        this.w(0.0002),
        this.R.gauss(meanSingleLineThickness, singleLineVariance)
      );
      this.drawCleanCircle(finalX, finalY, r, thick, 0.007);
    }
  }

  hex(x: number, y: number, r: number, rotation: number = 0) {
    const [px, py] = this.convert(x, y);
    const radius = r * this.r * this.zoom;
    const sides = 3; // Number of sides for a hexagon
    this.p5.beginShape();
    for (let i = 0; i < sides; i++) {
      // Calculate angle, taking into account rotation
      let angle = this.p5.TWO_PI * (i / sides) + rotation;
      let sx = px + this.p5.cos(angle) * radius;
      let sy = py + this.p5.sin(angle) * radius;
      this.p5.vertex(sx, sy);
    }
    this.p5.endShape(this.p5.CLOSE);
  }

  mote(x: number, y: number, r: number) {
    const [px, py] = this.convert(x, y);
    const radius = r * this.r * this.zoom;

    // Define control points for the Bezier curve
    const cp1x = px - radius;
    const cp1y = py;
    const cp2x = px + radius;
    const cp2y = py;

    this.p5.beginShape();
    this.p5.vertex(px - radius, py);
    this.p5.bezierVertex(cp1x, cp1y, cp2x, cp2y, px + radius, py);
    this.p5.vertex(px + radius, py);
    this.p5.bezierVertex(cp2x, cp2y, cp1x, cp1y, px - radius, py);
    this.p5.endShape(this.p5.CLOSE);
  }
  blobbyMote(x: number, y: number, r: number, t: number) {
    const [px, py] = this.convert(x, y);
    const radius = r * this.r * this.zoom;
    const angleStep = this.p5.TWO_PI / 24; // Adjust this to change the "resolution" of the blob

    this.p5.beginShape();
    for (let a = 0; a < this.p5.TWO_PI; a += angleStep) {
      let offset = this.p5.map(this.p5.noise(a, t), 0, 1, -2, 4); // Adjust these numbers to change the amount of variation
      let r = radius + offset;
      let sx = px + this.p5.cos(a) * r;
      let sy = py + this.p5.sin(a) * r;
      this.p5.vertex(sx, sy);
    }
    this.p5.endShape(this.p5.CLOSE);
  }

  waveformMote(x: number, y: number, r: number, t: number) {
    const [px, py] = this.convert(x, y);
    const radius = r * this.r * this.zoom;
    const angleStep = this.p5.TWO_PI / 20; // Adjust this to change the "resolution" of the waveform

    this.p5.beginShape();
    for (let a = 0; a < this.p5.TWO_PI; a += angleStep) {
      let offset = this.p5.map(this.p5.sin(a * 10 + t), -1, 1, -25, 25); // Adjust these numbers to change the amplitude and frequency of the waveform
      let r = radius + offset;
      let sx = px + this.p5.cos(a) * r;
      let sy = py + this.p5.sin(a) * r;
      this.p5.vertex(sx, sy);
    }
    this.p5.endShape(this.p5.CLOSE);
  }

  spiralMote(x: number, y: number, r: number, t: number) {
    const [px, py] = this.convert(x, y);
    const radius = r * this.r * this.zoom;
    const angleStep = this.p5.TWO_PI / 100; // Adjust this to change the "resolution" of the spiral

    this.p5.beginShape();
    for (let a = 0; a < this.p5.TWO_PI; a += angleStep) {
      let spiralRadius = this.p5.map(a, 0, this.p5.TWO_PI, 0, radius); // This creates the spiral effect
      let sx = px + this.p5.cos(a + t) * spiralRadius; // t is added to the angle to rotate the spiral over time
      let sy = py + this.p5.sin(a + t) * spiralRadius;
      this.p5.vertex(sx, sy);
    }
    this.p5.endShape();
  }

  fibonacciMote(x: number, y: number, r: number, t: number) {
    const [startX, startY] = this.convert(x, y);
    this.p5.push();
    const xCenterOffset = r * 1.15;
    const yCenterOffset = r * 0.72;
    this.p5.translate(startX + xCenterOffset, startY + yCenterOffset);
    this.p5.rotate(t);
    this.p5.translate(-xCenterOffset, -yCenterOffset);

    var strokeW = 1;

    for (var i = 0; i < 4; i++) {
      this.p5.strokeWeight(strokeW);
      strokeW += 0.5;

      this.p5.arc(r, r, 2 * r, 2 * r, this.p5.PI, this.p5.PI + this.p5.HALF_PI);

      this.p5.rotate(this.p5.HALF_PI);
      this.p5.scale(0.618);
      this.p5.translate(0, -2.618 * r);
    }
    this.p5.pop();
  }

  atomMote(x: number, y: number, r: number, t: number, hsb: HSB) {
    const [px, py] = this.convert(x, y);
    const radius = r * this.r * this.zoom;
    const nucleusRadius = 4;
    const electronRadius = 2;
    const trailLength = 100; // The number of steps to go back in the trail
    const stepSize = 0.01; // The step size for the backwards simulation

    // Draw the nucleus
    this.p5.circle(px, py, nucleusRadius);

    // Start a new shape for the trail
    this.p5.beginShape();

    // Draw the trail
    for (let i = 0; i < trailLength; i++) {
      // Calculate the position of the electron at a previous time
      let trailT = t - i * stepSize;
      let trailX = px + this.p5.cos(trailT) * radius;
      let trailY = py + this.p5.sin(trailT) * radius;

      // Create a color with the given HSB values and decreasing alpha
      let c = this.p5.color(
        hsb.hue,
        hsb.sat,
        hsb.bright,
        255 * ((trailLength - i) / trailLength)
      );

      // Set the stroke color
      this.p5.stroke(c);

      // Add a vertex at the calculated position
      this.p5.vertex(trailX, trailY);
    }

    // End the shape
    this.p5.endShape();

    // Draw the electron
    let electronX = px + this.p5.cos(t) * radius;
    let electronY = py + this.p5.sin(t) * radius;
    this.p5.circle(electronX, electronY, electronRadius);
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

interface HSB {
  hue: number;
  sat: number;
  bright: number;
}
