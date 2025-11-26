import { Rng } from "./random.ts";
import { RenderParams } from "./renderParams.ts";
import { RenderContext } from "./renderContext.ts";
import { ColorInterpolationSystem } from "./colorInterpolationSystem.ts";

type MoteRenderSpec = {
  sizeFactor: number;
  thickness: number;
  xOffset: number;
  yOffset: number;
};

function randomMoteSpec(rng: Rng, params: RenderParams): MoteRenderSpec {
  return {
    sizeFactor: Math.max(
      rng.gauss(params.moteSizeFactorMean, params.moteSizeFactorVariance),
      params.moteSizeFactorMin
    ),
    thickness: rng.gauss(params.moteThicknessMean, params.moteThicknessVariance),
    xOffset: rng.gauss(0, params.moteOffsetVariance),
    yOffset: rng.gauss(0, params.moteOffsetVariance),
  };
}

class MoteRenderer {
  private nMotes: number;
  private params: RenderParams;
  private moteSpecs: MoteRenderSpec[];
  private colorSystem: ColorInterpolationSystem;

  constructor(params: RenderParams, nMotes: number, rng: Rng) {
    this.params = params;

    this.nMotes = nMotes;
    this.moteSpecs = Array.from({ length: this.nMotes }, () =>
      randomMoteSpec(rng, params)
    );
    this.colorSystem = new ColorInterpolationSystem(
      params.colorInterpolationPoints
    );
  }

  render(
    moteX: Float32Array,
    moteY: Float32Array,
    motePressure: Uint8Array,
    rc: RenderContext
  ): void {
    rc.background(
      this.params.backgroundColor.h,
      this.params.backgroundColor.s,
      this.params.backgroundColor.b
    );
    rc.noFill();

    const size = this.params.moteRenderRadius;

    for (let i = 0; i < this.nMotes; i++) {
      const x = moteX[i];
      const y = moteY[i];
      const pressure = motePressure[i];
      let { thickness, xOffset, yOffset, sizeFactor } = this.moteSpecs[i];
      const hsb = this.colorSystem.getColor(pressure);
      rc.stroke(hsb.h, hsb.s, hsb.b);
      rc.strokeWeight(thickness);
      rc.circle(x + xOffset, y + yOffset, size * sizeFactor);
    }
  }
}

export { MoteRenderer };
