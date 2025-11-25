import { Rng } from "./random.ts";
import { Spec } from "./spec.ts";
import { RenderContext } from "./renderContext.ts";
import { ColorInterpolationSystem } from "./colorInterpolationSystem.ts";

type MoteRenderSpec = {
  sizeFactor: number;
  thickness: number;
  opacity: number;
  xOffset: number;
  yOffset: number;
};

function randomMoteSpec(rng: Rng): MoteRenderSpec {
  return {
    sizeFactor: Math.max(rng.gauss(1, 0.4), 0.1),
    thickness: rng.gauss(0.5, 0.12),
    opacity: Math.min(rng.gauss(0.9, 0.2), 1),
    xOffset: rng.gauss(0, 0.3),
    yOffset: rng.gauss(0, 0.3),
  };
}

class MoteRenderer {
  private nMotes: number;
  private spec: Spec;
  private moteSpecs: MoteRenderSpec[];
  private colorSystem: ColorInterpolationSystem;

  constructor(spec: Spec, rng: Rng) {
    this.spec = spec;

    this.nMotes = spec.numMotes;
    this.moteSpecs = Array.from({ length: this.nMotes }, () =>
      randomMoteSpec(rng)
    );
    this.colorSystem = new ColorInterpolationSystem(
      spec.colorInterpolationPoints
    );
  }

  // Render phase
  render(motes: Float32Array, stepCounter: number, rc: RenderContext): void {
    rc.background(240, 100, 10);

    rc.strokeWeight(1.5);
    rc.noFill();

    for (let i = 0; i < this.nMotes; i++) {
      this.renderMote(motes, i, stepCounter, rc);
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
    let { opacity, thickness, xOffset, yOffset, sizeFactor } = moteSpec;
    rc.stroke(hsb.h, hsb.s, hsb.b, b * 100 * opacity);
    rc.strokeWeight(thickness);
    rc.circle(x + xOffset, y + yOffset, size * sizeFactor);
  }
}

export { MoteRenderer };
