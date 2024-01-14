import p5 from "p5";

import { World } from "./world";
import { Mote } from "./mote";
import { FlowField, flowSpec } from "./flowField";
import { Spec } from "./spec";
import randomSeed from "./randomSeed";
import { makeSeededRng, Rng } from "./safeRandom";
import { RenderContext } from "./renderContext";
import { PolysomeInstance } from "./instance";

export class Currents implements PolysomeInstance {
  rng: Rng;
  spec: Spec;
  world: World;
  rc: RenderContext | null;

  constructor(seed: string, xDim: number, yDim: number) {
    this.rc = null;
    this.rng = makeSeededRng(seed);
    this.spec = new Spec();
    this.spec.xDim = xDim;
    this.spec.yDim = yDim;
    const ff = new FlowField(flowSpec(this.rng, this.spec));
    this.world = new World(this.spec, this.rng, ff);
  }

  setup(p5: p5) {
    const zoomLevel = 1.1;
    this.rc = new RenderContext(p5, this.spec, zoomLevel);
  }

  step() {
    this.world.step();
  }

  draw() {
    if (!this.rc) {
      throw new Error("Instance not setup");
    }
    this.world.render(this.rc);
  }
}
