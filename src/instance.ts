import { Spec } from "./spec.js";
import { Vector } from "./vector.js";
import { makeSeededRng, Rng } from "./safeRandom.js";
import { RenderContext } from "./renderContext.js";
import { MoteRenderer } from "./moteRenderer.js";
import { MoteSimulator } from "./moteSimulator.js";

const PERF_LOG_INTERVAL = 10;
const NO_LOGGING_AFTER = 60;

export class Instance {
  rng: Rng;
  spec: Spec;
  private moteSimulator: MoteSimulator;
  private moteRenderer: MoteRenderer;
  rc: RenderContext | null;
  bounds: Vector;
  private animationFrameId: number | null = null;

  // Performance tracking
  private perfStats: Array<{
    simTime: number;
    renderTime: number;
    frameTime: number;
  }> = [];

  constructor(seed: string, xDim: number, yDim: number, debug: boolean) {
    this.rc = null;
    this.rng = makeSeededRng(seed);
    this.spec = new Spec();
    this.spec.debugMode = debug;
    this.bounds = new Vector(xDim, yDim);
    this.moteRenderer = new MoteRenderer(this.spec, this.rng, this.bounds);

    // Initialize simulator directly on main thread
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

      const simTime = this.step();
      const renderTime = this.draw();

      const frameTime = performance.now() - frameStart;

      this.perfStats.push({
        simTime: simTime,
        renderTime: renderTime,
        frameTime: frameTime,
      });

      if (this.perfStats.length > PERF_LOG_INTERVAL) {
        this.perfStats.shift();
      }

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

  step() {
    const start = performance.now();
    this.moteSimulator.step();
    return performance.now() - start;
  }

  draw() {
    if (!this.rc) {
      throw new Error("Instance not setup");
    }
    const start = performance.now();

    this.moteRenderer.render(
      this.moteSimulator.motes,
      this.moteSimulator.stepCounter,
      this.rc
    );
    return performance.now() - start;
  }

  private logPerformance() {
    const step = this.moteSimulator.stepCounter;

    if (this.perfStats.length === 0 || step > NO_LOGGING_AFTER) return;

    const latest = this.perfStats[this.perfStats.length - 1];

    if (step < PERF_LOG_INTERVAL) {
      console.log(
        `Step ${step}: sim=${latest.simTime.toFixed(2)}ms render=${latest.renderTime.toFixed(2)}ms frame=${latest.frameTime.toFixed(2)}ms`
      );
    } else if (step % PERF_LOG_INTERVAL === 0) {
      const avgSim =
        this.perfStats.reduce((sum, s) => sum + s.simTime, 0) /
        this.perfStats.length;
      const avgRender =
        this.perfStats.reduce((sum, s) => sum + s.renderTime, 0) /
        this.perfStats.length;
      const avgFrame =
        this.perfStats.reduce((sum, s) => sum + s.frameTime, 0) /
        this.perfStats.length;

      console.log(
        `Step ${step} (avg last ${this.perfStats.length}): sim=${avgSim.toFixed(2)}ms render=${avgRender.toFixed(2)}ms frame=${avgFrame.toFixed(2)}ms (${(1000 / avgFrame).toFixed(1)} fps)`
      );
    }
  }
}
