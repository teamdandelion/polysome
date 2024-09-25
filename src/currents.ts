import p5 from "p5";

import { FlowField, DynamicFlowField, flowSpec } from "./flowField.js";
import { Spec } from "./spec.js";
import { makeSeededRng, Rng } from "./safeRandom.js";
import { RenderContext } from "./renderContext.js";
import { PolysomeInstance } from "./instance.js";
import { MoteRenderer } from "./moteRenderer.js";

export class Currents implements PolysomeInstance {
  rng: Rng;
  spec: Spec;
  private moteSimWorker: Worker;
  private moteRenderer: MoteRenderer;
  private motes: Float32Array;
  private stepCounter = 0;
  rc: RenderContext | null;
  bounds: p5.Vector;

  constructor(seed: string, xDim: number, yDim: number, debug: boolean) {
    this.rc = null;
    this.rng = makeSeededRng(seed);
    this.spec = new Spec();
    this.spec.debugMode = debug;
    this.bounds = new p5.Vector(xDim, yDim);
    this.motes = new Float32Array(this.spec.numMotes * 4);
    this.moteRenderer = new MoteRenderer(this.spec, this.rng, this.bounds);
    this.moteSimWorker = new Worker(
      new URL("./moteSimulationWorker.ts", import.meta.url),
      { type: "module" }
    );
    this.moteSimWorker.postMessage({
      type: "init",
      data: { spec: this.spec, seed, xDim, yDim },
    });
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

    // Set up message handling from the worker
    this.moteSimWorker.onmessage = (e) => {
      const { type, motes, stepCounter } = e.data;
      if (type === "update") {
        this.motes = new Float32Array(motes);
        this.stepCounter = stepCounter;
      }
    };
  }

  step() {
    this.moteSimWorker.postMessage({ type: "step" });
  }

  draw() {
    if (!this.rc) {
      throw new Error("Instance not setup");
    }
    this.moteRenderer.render(this.motes, this.stepCounter, this.rc);
  }
}
