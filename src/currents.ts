import p5 from "p5";

import { World } from "./world";
import { Mote } from "./mote";
import { FlowField, DynamicFlowField, flowSpec } from "./flowField";
import { Spec } from "./spec";
import randomSeed from "./randomSeed";
import { makeSeededRng, Rng } from "./safeRandom";
import { RenderContext } from "./renderContext";
import { PolysomeInstance } from "./instance";

export class Currents implements PolysomeInstance {
  rng: Rng;
  spec: Spec;
  world: World;
  ff: DynamicFlowField;
  rc: RenderContext | null;
  bounds: p5.Vector;

  constructor(seed: string, xDim: number, yDim: number, debug: boolean) {
    this.rc = null;
    this.rng = makeSeededRng(seed);
    this.spec = new Spec();
    this.spec.debugMode = debug;
    this.bounds = new p5.Vector(xDim, yDim);

    this.ff = new DynamicFlowField(this.rng, this.bounds);
    this.world = new World(this.spec, this.rng, this.ff, this.bounds);
  }

  setup(p5: p5) {
    const zoomLevel = 1;
    this.rc = new RenderContext(
      p5,
      this.spec,
      this.bounds,
      zoomLevel,
      this.rng
    );
  }

  step() {
    this.world.step();
    this.ff.step();
  }

  draw() {
    if (!this.rc) {
      throw new Error("Instance not setup");
    }
    this.world.render(this.rc);
  }
}
