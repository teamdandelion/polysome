import { Rng } from "./safeRandom.ts";
import { Spec } from "./spec.ts";
import { RenderContext } from "./renderContext.ts";
import { ColorInterpolationSystem } from "./colorInterpolationSystem.ts";

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
  let numRings = rng.choice([1]);
  for (let i = 0; i < numRings; i++) {
    rings.push({
      sizeFactor: Math.max(rng.gauss(1, 0.4), 0.1),
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

class MoteRenderer {
  private nMotes: number;
  private spec: Spec;
  private moteSpecs: MoteRenderSpec[];
  private start: number;
  private colorSystem: ColorInterpolationSystem;
  private frameCount: number = 0;
  private lastFpsUpdate: number = Date.now();
  private fps: number = 60;

  constructor(spec: Spec, rng: Rng) {
    this.spec = spec;

    this.nMotes = spec.numMotes;
    this.moteSpecs = Array.from({ length: this.nMotes }, () =>
      randomMoteSpec(rng)
    );
    this.colorSystem = new ColorInterpolationSystem(
      spec.colorInterpolationPoints
    );
    this.start = Date.now();
  }

  // Render phase
  render(motes: Float32Array, stepCounter: number, rc: RenderContext): void {
    rc.background(240, 100, 10);

    rc.strokeWeight(1.5);
    rc.noFill();

    for (let i = 0; i < this.nMotes; i++) {
      this.renderMote(motes, i, stepCounter, rc);
    }

    // Update FPS counter
    this.frameCount++;
    const now = Date.now();
    if (now - this.lastFpsUpdate > 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    if (this.spec.debugMode) {
      rc.fill(240, 100, 10, 60);
      let x = rc.canvasWidth - 180;
      let y = 10;
      rc.rect(x, y, 180, 110);
      rc.fill(60, 20, 100);
      rc.textSize(14);
      const textLine = (line: string) => {
        rc.text(line, x + 10, y + 20);
        y += 20;
      };
      const elapsed = (Date.now() - this.start) / 1000;
      textLine(`Polysome             ${this.fps} fps`);
      textLine(
        `step: ${stepCounter.toLocaleString()}               ${elapsed.toFixed(
          0
        )}s`
      );
      textLine(`nMotes: ${this.nMotes.toLocaleString()}`);
    }
  }

  private renderMote(
    motes: Float32Array,
    idx: number,
    stepCounter: number,
    rc: RenderContext
  ) {
    const x = motes[idx * 4];
    const y = motes[idx * 4 + 1];
    const n = motes[idx * 4 + 2];
    const age = stepCounter - motes[idx * 4 + 3];
    const moteSpec = this.moteSpecs[idx];

    let b = Math.min(1, age / 20);
    let size = this.spec.moteRenderRadius;

    const hsb = this.colorSystem.getColor(n);
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
      rc.stroke(hsb.h, hsb.s, hsb.b, b * 100 * opacity);
      rc.sWeight(thickness);
      let w = size * sizeFactor * wFactor;
      let h = size * sizeFactor * hFactor;

      rc.ellipse(x + xOffset, y + yOffset, w, h);
    }
  }
}

export { MoteRenderer };
