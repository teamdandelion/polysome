import { Rng } from "./random.ts";
import { Spec } from "./spec.ts";
import { RenderContext } from "./renderContext.ts";
import { ColorInterpolationSystem } from "./colorInterpolationSystem.ts";

type MoteRenderSpec = {
  sizeFactor: number;
  thickness: number;
  xOffset: number;
  yOffset: number;
};

function randomMoteSpec(rng: Rng): MoteRenderSpec {
  return {
    sizeFactor: Math.max(rng.gauss(1, 0.4), 0.1),
    thickness: rng.gauss(0.5, 0.12),
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

  render(
    motesX: Float32Array,
    motesY: Float32Array,
    motesCollisions: Uint8Array,
    rc: RenderContext
  ): void {
    rc.background(240, 100, 10);

    rc.strokeWeight(1.5);
    rc.noFill();

    for (let i = 0; i < this.nMotes; i++) {
      this.renderMote(motesX, motesY, motesCollisions, i, rc);
    }
  }

  private renderMote(
    motesX: Float32Array,
    motesY: Float32Array,
    motesCollisions: Uint8Array,
    idx: number,
    rc: RenderContext
  ) {
    const x = motesX[idx];
    const y = motesY[idx];
    const n = motesCollisions[idx];
    const moteSpec = this.moteSpecs[idx];

    let size = this.spec.moteRenderRadius;

    const hsb = this.colorSystem.getColor(n);
    let { thickness, xOffset, yOffset, sizeFactor } = moteSpec;
    rc.stroke(hsb.h, hsb.s, hsb.b, 100);
    rc.strokeWeight(thickness);
    rc.circle(x + xOffset, y + yOffset, size * sizeFactor);
  }
}

export { MoteRenderer };
