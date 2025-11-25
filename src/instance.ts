import { Spec } from "./spec.ts";
import { Vector } from "./vector.ts";
import { makeSeededRng, Rng } from "./safeRandom.ts";
import { RenderContext } from "./renderContext.ts";
import { MoteRenderer } from "./moteRenderer.ts";
import { MoteSimulator } from "./moteSimulator.ts";
import { PerfBuffer, PerfMap } from "./perfBuffer.ts";

const PERF_TEMPLATE =
  "frame=$frame render=$render simulate=$simulate\n  flowField=$simulate/flowField reset=$simulate/reset processCollisions=$simulate/processCollisions moveMotes=$simulate/moveMotes\n  nCollisions=$simulate/nCollisions";

export class Instance {
  rng: Rng;
  spec: Spec;
  private moteSimulator: MoteSimulator;
  private moteRenderer: MoteRenderer;
  rc: RenderContext | null;
  bounds: Vector;
  private animationFrameId: number | null = null;

  // Performance tracking
  private perfBuffer: PerfBuffer = new PerfBuffer(1000);

  constructor(seed: string, xDim: number, yDim: number, debug: boolean) {
    this.rc = null;
    this.rng = makeSeededRng(seed);
    this.spec = new Spec();
    this.spec.debugMode = debug;
    this.bounds = new Vector(xDim, yDim);
    this.moteRenderer = new MoteRenderer(this.spec, this.rng, this.bounds);

    this.moteSimulator = new MoteSimulator(this.spec, seed, xDim, yDim);
  }

  setup(canvas: HTMLCanvasElement) {
    const zoomLevel = 1;
    this.rc = new RenderContext(
      canvas,
      this.spec,
      this.bounds,
      zoomLevel,
      this.rng
    );
  }

  start() {
    const animate = () => {
      const frameStart = performance.now();

      // Get simulator performance metrics
      const stepPerf = this.step();

      const renderStart = performance.now();
      this.draw();
      const renderTime = performance.now() - renderStart;

      const frameTime = performance.now() - frameStart;

      const perf: PerfMap = new Map(stepPerf);
      perf.set("frame", frameTime);
      perf.set("render", renderTime);

      this.perfBuffer.recordPerf(this.moteSimulator.stepCounter, perf);

      this.logPerformance();

      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  step(): PerfMap {
    return this.moteSimulator.step();
  }

  draw() {
    if (!this.rc) {
      throw new Error("Instance not setup");
    }

    this.moteRenderer.render(
      this.moteSimulator.motes,
      this.moteSimulator.stepCounter,
      this.rc
    );
  }

  private logPerformance() {
    const step = this.moteSimulator.stepCounter;

    let interval = 10;
    if (step >= 100) {
      interval = 100;
    }
    if (step >= 500) {
      interval = 500;
    }
    if (step >= 1000) {
      interval = 1000;
    }

    if (step < interval) {
      this.perfBuffer.logPerf(PERF_TEMPLATE);
    } else if (step % interval === 0) {
      this.perfBuffer.logAveragePerf(interval, PERF_TEMPLATE);
    }
  }
}
