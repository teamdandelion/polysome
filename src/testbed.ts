import p5 from "p5";

import { World } from "./world";
import { Mote } from "./mote";
import {
  FlowField,
  DynamicFlowField,
  flowSpec,
  TestFlowField,
} from "./flowField";
import { Spec } from "./spec";
import randomSeed from "./randomSeed";
import { makeSeededRng, Rng } from "./safeRandom";
import { RenderContext } from "./renderContext";
import { PolysomeInstance } from "./instance";

export class Testbed implements PolysomeInstance {
  rng: Rng;
  spec: Spec;
  world: World;
  ff: TestFlowField;
  rc: RenderContext | null;
  bounds: p5.Vector;

  constructor(seed: string, xDim: number, yDim: number) {
    this.rc = null;
    this.rng = makeSeededRng(seed);
    this.spec = new Spec();
    this.spec.moteRadius = 40;
    this.spec.numMotes = 100;
    this.spec.motesPerStep = 1;
    this.spec.moteRenderScale = 1;
    this.spec.moteHueFactor = 4;
    this.spec.moteBrightFactor = 2;
    this.spec.debugMode = true;
    this.bounds = new p5.Vector(xDim, yDim);

    this.ff = new TestFlowField(this.bounds.x / 2, this.bounds.y / 2);
    this.world = new World(this.spec, this.rng, this.ff, this.bounds);
  }

  setup(p5: p5) {
    const zoomLevel = 1;
    this.rc = new RenderContext(p5, this.spec, this.bounds, zoomLevel);
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
