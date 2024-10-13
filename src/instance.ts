import p5 from "p5";

import { Spec } from "./spec.js";
import { Vector } from "./vector.js";
import { makeSeededRng, Rng } from "./safeRandom.js";
import { RenderContext } from "./renderContext.js";
import { MoteRenderer } from "./moteRenderer.js";
import { Cluster } from "./moteSimulator.js";

export function sketchify(instance: Instance) {
  return (p5: p5) => sketch(instance, p5);
}

function sketch(instance: Instance, p5: p5) {
  p5.setup = () => {
    instance.setup(p5);
  };

  p5.draw = () => {
    instance.step();
    instance.draw();
  };
}

export class Instance {
  rng: Rng;
  spec: Spec;
  private moteSimWorker: Worker;
  private moteRenderer: MoteRenderer;
  private motes: Float32Array;
  private stepCounter = 0;
  private clusters: Cluster[] = [];
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
      const { type, motes, stepCounter, clusters } = e.data;
      if (type === "update") {
        this.motes = new Float32Array(motes);
        this.clusters = clusters.map((v: any) => Cluster.fromJSON(v));
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
    this.moteRenderer.render(
      this.motes,
      this.clusters,
      this.stepCounter,
      this.rc
    );
  }
}
