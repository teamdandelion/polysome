import p5 from "p5";

import { IFlowField } from "./flowField";
import { Rng } from "./safeRandom";
import { Spec } from "./spec";
import { RenderContext } from "./renderContext";
import { Mote } from "./mote";

type RingRenderSpec = {
  sizeFactor: number;
  thickness: number;
  opacity: number;
  xOffset: number;
  yOffset: number;
  wFactor: number;
  hFactor: number;
};

type MoteRenderSpec = {
  rings: RingRenderSpec[];
};

function randomMoteSpec(rng: Rng): MoteRenderSpec {
  let rings = [];
  let numRings = rng.choice([1, 1, 2, 2, 3, 5]);
  for (let i = 0; i < numRings; i++) {
    rings.push({
      sizeFactor: rng.gauss(1, 0.4),
      thickness: rng.gauss(0.5, 0.12),
      opacity: Math.min(rng.gauss(0.9, 0.2), 1),
      xOffset: rng.gauss(0, 0.3),
      yOffset: rng.gauss(0, 0.3),
      wFactor: rng.gauss(1, 0.042),
      hFactor: rng.gauss(1, 0.042),
    });
  }
  return { rings };
}

class MoteSimulator {
  private rng: Rng;
  private xMax: number;
  private yMax: number;

  private nMotes: number;
  private motes: Float32Array;
  private velocities: Float32Array;
  private flowField: IFlowField;
  private spec: Spec;
  private moteSpecs: MoteRenderSpec[];
  private start: number;
  private stepCounter = 0;

  constructor(spec: Spec, rng: Rng, flowField: IFlowField, bounds: p5.Vector) {
    this.spec = spec;
    this.xMax = bounds.x;
    this.yMax = bounds.y;
    this.rng = rng;
    this.flowField = flowField;

    this.nMotes = spec.numMotes;
    this.moteSpecs = Array.from({ length: this.nMotes }, () =>
      randomMoteSpec(rng)
    );
    this.motes = new Float32Array(this.nMotes * 4); // x, y, nCollisions, stepAdded
    this.velocities = new Float32Array(this.nMotes * 2); // vx, vy

    // Initialize mote positions randomly
    for (let i = 0; i < this.nMotes; i++) {
      this.motes[i * 4] = this.rng.uniform(0, this.xMax);
      this.motes[i * 4 + 1] = this.rng.uniform(0, this.yMax);
      this.motes[i * 4 + 2] = 0; // Initialize collision count to 0
      this.motes[i * 4 + 3] = 0; // Initialize step-added-on to 0
    }
    this.start = Date.now();
  }

  step(): void {
    this.reset(); // Reset mote colllision velocities and collision counts
    this.processCollisions(); // Compute collision velocity and count for each mote
    this.moveMotes(); // Move motes based on collision velocities and flow field
    this.stepCounter++;
  }

  reset(): void {
    for (let i = 0; i < this.nMotes; i++) {
      // Check if the mote is out of bounds
      if (
        this.motes[i * 4] < 0 ||
        this.motes[i * 4] > this.xMax ||
        this.motes[i * 4 + 1] < 0 ||
        this.motes[i * 4 + 1] >= this.yMax
      ) {
        // Assign a random position in-bounds
        this.motes[i * 4] = this.rng.uniform(0, this.xMax);
        this.motes[i * 4 + 1] = this.rng.uniform(0, this.yMax);
        this.motes[i * 4 + 3] = this.stepCounter;
      }
      this.motes[i * 4 + 2] = 0; // Reset collision count
      this.velocities[i * 2] = 0; // Reset x velocity
      this.velocities[i * 2 + 1] = 0; // Reset y velocity
    }
  }

  processCollisions(): void {
    const gridSize = this.spec.moteRadius;
    const grid = new Map<string, number[]>();

    // Populate the grid
    for (let i = 0; i < this.nMotes; i++) {
      const x = Math.floor(this.motes[i * 4] / gridSize);
      const y = Math.floor(this.motes[i * 4 + 1] / gridSize);
      const key = `${x},${y}`;
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(i);
    }

    // Check for collisions
    for (let [key, motesInCell] of grid.entries()) {
      const [x, y] = key.split(",").map(Number);
      const neighbors = [
        `${x},${y}`,
        `${x + 1},${y}`,
        `${x - 1},${y}`,
        `${x},${y + 1}`,
        `${x},${y - 1}`,
        `${x + 1},${y + 1}`,
        `${x - 1},${y - 1}`,
        `${x + 1},${y - 1}`,
        `${x - 1},${y + 1}`,
      ];

      const radiusSq = this.spec.moteRadius * this.spec.moteRadius;
      for (let neighborKey of neighbors) {
        if (grid.has(neighborKey)) {
          const neighborMotes = grid.get(neighborKey)!;
          for (let i of motesInCell) {
            for (let j of neighborMotes) {
              if (i < j) {
                const dx = this.motes[j * 4] - this.motes[i * 4];
                const dy = this.motes[j * 4 + 1] - this.motes[i * 4 + 1];
                const dsq = dx * dx + dy * dy;
                if (dsq < radiusSq) {
                  const v = new p5.Vector(dx, dy);
                  const d = Math.sqrt(dsq);
                  this.collide(i, j, d, v);
                }
              }
            }
          }
        }
      }
    }
  }

  moveMotes() {
    for (let i = 0; i < this.nMotes; i++) {
      // Compute the flow field vector for the mote
      const flowVector = this.flowField.flow(
        new p5.Vector(this.motes[i * 4], this.motes[i * 4 + 1])
      );

      // Scale the magnitude of the flow field vector
      const nCollisions = this.motes[i * 4 + 2];
      const flowCoefficient = Math.pow(
        this.spec.cxFlowCoefficient,
        nCollisions
      );
      flowVector.mult(this.spec.flowCoefficient * flowCoefficient);

      // Update the mote position based on the flow field vector and the aggregate collision vector
      this.motes[i * 4] += flowVector.x + this.velocities[i * 2];
      this.motes[i * 4 + 1] += flowVector.y + this.velocities[i * 2 + 1];
    }
  }

  // Handle collisions
  private collide(a: number, b: number, d: number, v: p5.Vector): void {
    let forceFactor = this.spec.moteForce;
    if (d >= this.spec.moteRadius - this.spec.moteCollisionDecay) {
      forceFactor =
        (this.spec.moteForce * (this.spec.moteRadius - d)) /
        this.spec.moteCollisionDecay;
    }
    v.setMag(forceFactor);
    this.velocities[a * 2] -= v.x;
    this.velocities[a * 2 + 1] -= v.y;
    this.velocities[b * 2] += v.x;
    this.velocities[b * 2 + 1] += v.y;

    // Increment collision counts
    this.motes[a * 4 + 2]++;
    this.motes[b * 4 + 2]++;
  }

  // Render phase
  render(rc: RenderContext): void {
    rc.background(240, 100, 10);

    rc.strokeWeight(1.5);
    rc.noFill();

    for (let i = 0; i < this.nMotes; i++) {
      this.renderMote(i, rc);
    }

    if (this.spec.debugPane) {
      const p5 = rc.p5;
      p5.fill(240, 100, 10, 60);
      let x = p5.windowWidth - 180;
      let y = 10;
      p5.rect(x, y, 180, 110);
      p5.fill(60, 20, 100);
      p5.textSize(14);
      function textLine(line: string) {
        p5.text(line, x + 10, y + 20);
        y += 20;
      }
      const elapsed = (Date.now() - this.start) / 1000;
      textLine(`Polysome             ${p5.frameRate().toFixed(0)} fps`);
      textLine(
        `step: ${this.stepCounter.toLocaleString()}               ${elapsed.toFixed(
          0
        )}s`
      );
      textLine(`nMotes: ${this.nMotes.toLocaleString()}`);
    }
  }

  private renderMote(idx: number, rc: RenderContext) {
    const x = this.motes[idx * 4];
    const y = this.motes[idx * 4 + 1];
    const n = this.motes[idx * 4 + 2];
    const age = this.stepCounter - this.motes[idx * 4 + 3];
    const moteSpec = this.moteSpecs[idx];

    let hue = this.spec.moteHueBaseline + n * this.spec.moteHueFactor;
    hue = Math.min(hue, this.spec.moteMaxHue);
    let b = Math.min(1, age / 20);
    let size = this.spec.moteRenderRadius;
    let rotation = (age / 10) % (2 * Math.PI);
    let hsb = {
      hue: hue,
      sat: 100,
      bright: 80 + n * this.spec.moteBrightFactor,
    };
    for (let i = 0; i < moteSpec.rings.length; i++) {
      let {
        opacity,
        thickness,
        xOffset,
        yOffset,
        sizeFactor,
        wFactor,
        hFactor,
      } = moteSpec.rings[i];
      rc.stroke(hsb.hue, hsb.sat, hsb.bright, b * 100 * opacity);
      rc.sWeight(thickness);
      let w = size * sizeFactor * wFactor;
      let h = size * sizeFactor * hFactor;

      rc.ellipse(x + xOffset, y + yOffset, w, h);
    }
  }
}

export { MoteSimulator };
