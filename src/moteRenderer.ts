import p5 from "p5";

import { Rng } from "./safeRandom.js";
import { Spec } from "./spec.js";
import { RenderContext } from "./renderContext.js";

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
  private rng: Rng;
  private xMax: number;
  private yMax: number;

  private nMotes: number;
  private spec: Spec;
  private moteSpecs: MoteRenderSpec[];
  private start: number;

  constructor(spec: Spec, rng: Rng, bounds: p5.Vector) {
    this.spec = spec;
    this.xMax = bounds.x;
    this.yMax = bounds.y;
    this.rng = rng;

    this.nMotes = spec.numMotes;
    this.moteSpecs = Array.from({ length: this.nMotes }, () =>
      randomMoteSpec(rng)
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

export { MoteRenderer };