import { SimulationParams } from "./simulationParams.ts";
import { RenderParams } from "./renderParams.ts";
import { Vector } from "./vector.ts";
import { makeSeededRng, Rng } from "./random.ts";
import { RenderContext } from "./renderContext.ts";
import { MoteRenderer } from "./moteRenderer.ts";
import { FlowFieldRenderer } from "./flowFieldRenderer.ts";
import { PerfBuffer, PerfMap } from "./perfBuffer.ts";
import { Simulation } from "./simulation.ts";
import type {
  PerformanceSample,
  SimulationPerformance,
} from "./performance.ts";

const PERF_TEMPLATE =
  "frame=$frame frameGap=$frameGap render=$render simulate=$simulate\n  flowField=$simulate/flowField reset=$simulate/reset processCollisions=$simulate/processCollisions moveMotes=$simulate/moveMotes\n  nCollisions=$simulate/nCollisions";
const FRAME_DEADLINE_TOLERANCE_MS = 1;

export type InstanceOptions = {
  /** Simulation overrides applied before the simulator is constructed. */
  simulation?: Partial<SimulationParams>;
  /** Rendering overrides applied before the renderer is constructed. */
  render?: Partial<RenderParams>;
  /** Maximum rendered frames per second. Omit to follow the display refresh rate. */
  maxFps?: number;
  /** Maximum backing-store pixel ratio. Lower values reduce rendering work. */
  maxPixelRatio?: number;
  /** Resize the canvas backing store when the browser viewport changes. */
  autoResize?: boolean;
  /** Suspend animation while the document is hidden. */
  pauseWhenHidden?: boolean;
  /** Emit the built-in performance summaries to the console. */
  logPerformance?: boolean;
  /** Receive one detailed timing sample for each rendered frame. */
  onPerformanceSample?: (sample: PerformanceSample) => void;
};

export class Instance {
  rng: Rng;
  simParams: SimulationParams;
  renderParams: RenderParams;
  private simulation: Simulation;
  private moteRenderer: MoteRenderer;
  private flowFieldRenderer: FlowFieldRenderer;
  rc: RenderContext | null;
  bounds: Vector;
  private animationFrameId: number | null = null;
  private wantsToRun = false;
  private nextFrameDeadline = 0;
  private lastFrameStart = 0;
  private readonly maxFps: number | undefined;
  private readonly maxPixelRatio: number;
  private readonly autoResize: boolean;
  private readonly pauseWhenHidden: boolean;
  private readonly shouldLogPerformance: boolean;
  private readonly onPerformanceSample:
    ((sample: PerformanceSample) => void) | undefined;
  private readonly shouldCollectPerformance: boolean;

  // Performance tracking
  private perfBuffer: PerfBuffer = new PerfBuffer(1000);

  constructor(
    seed: string,
    xDim: number,
    yDim: number,
    options: InstanceOptions = {},
  ) {
    this.rc = null;
    this.rng = makeSeededRng(seed);
    this.simulation = new Simulation(seed, xDim, yDim, {
      parameters: options.simulation,
    });
    this.simParams = this.simulation.parameters;
    this.renderParams = Object.assign(new RenderParams(), options.render);
    this.renderParams.colorInterpolationPoints =
      this.renderParams.colorInterpolationPoints.map((point) => ({
        pressure: point.pressure,
        color: { ...point.color },
      }));
    this.maxFps = options.maxFps;
    this.maxPixelRatio = options.maxPixelRatio ?? 2;
    this.autoResize = options.autoResize ?? true;
    this.pauseWhenHidden = options.pauseWhenHidden ?? true;
    this.shouldLogPerformance = options.logPerformance ?? false;
    this.onPerformanceSample = options.onPerformanceSample;
    this.shouldCollectPerformance =
      this.shouldLogPerformance || this.onPerformanceSample !== undefined;
    this.bounds = new Vector(xDim, yDim);
    this.moteRenderer = new MoteRenderer(
      this.renderParams,
      this.simParams.numMotes,
      this.simParams.moteRadius,
      this.rng,
    );

    this.flowFieldRenderer = new FlowFieldRenderer(
      this.renderParams,
      this.simulation.flowField,
    );
  }

  setup(canvas: HTMLCanvasElement) {
    this.detachBrowserListeners();
    const zoomLevel = 1;
    this.rc = new RenderContext(
      canvas,
      this.renderParams,
      this.bounds,
      zoomLevel,
      this.rng,
      this.maxPixelRatio,
    );
    this.attachBrowserListeners();
  }

  start() {
    if (!this.rc) {
      throw new Error("Call setup(canvas) before start()");
    }
    if (!this.wantsToRun) {
      this.nextFrameDeadline = 0;
    }
    this.wantsToRun = true;
    this.scheduleAnimationFrame();
  }

  stop() {
    this.wantsToRun = false;
    this.nextFrameDeadline = 0;
    this.cancelAnimationFrame();
  }

  destroy() {
    this.stop();
    this.detachBrowserListeners();
    this.rc = null;
  }

  resize() {
    this.rc?.resize(undefined, undefined, this.maxPixelRatio);
  }

  private readonly animate = (timestamp: number) => {
    this.animationFrameId = null;

    if (!this.wantsToRun || this.shouldPauseForVisibility()) {
      return;
    }

    const minimumFrameDuration = this.maxFps ? 1000 / this.maxFps : 0;
    if (minimumFrameDuration > 0) {
      if (this.nextFrameDeadline === 0) {
        this.nextFrameDeadline = timestamp;
      }

      // Refresh timestamps can land just below an exact frame-rate boundary.
      if (timestamp + FRAME_DEADLINE_TOLERANCE_MS < this.nextFrameDeadline) {
        this.scheduleAnimationFrame();
        return;
      }

      const lateness = timestamp - this.nextFrameDeadline;
      this.nextFrameDeadline =
        lateness > minimumFrameDuration
          ? timestamp + minimumFrameDuration
          : this.nextFrameDeadline + minimumFrameDuration;
    }

    const frameStart = performance.now();
    const simulationPerformance = this.simulation.step(
      this.shouldCollectPerformance,
    );

    const renderStart = performance.now();
    this.draw();
    const renderTime = performance.now() - renderStart;
    const frameTime = performance.now() - frameStart;

    if (simulationPerformance) {
      const sample: PerformanceSample = {
        ...simulationPerformance,
        step: this.simulation.view().step,
        timestamp,
        frameMs: frameTime,
        frameIntervalMs:
          this.lastFrameStart === 0 ? 0 : frameStart - this.lastFrameStart,
        renderMs: renderTime,
      };

      this.onPerformanceSample?.(sample);

      if (this.shouldLogPerformance) {
        const perf = this.performanceMap(sample);
        this.perfBuffer.recordPerf(this.simulation.view().step, perf);
        this.logPerformance();
      }
    }

    this.lastFrameStart = frameStart;
    this.scheduleAnimationFrame();
  };

  private scheduleAnimationFrame() {
    if (
      this.animationFrameId !== null ||
      !this.wantsToRun ||
      this.shouldPauseForVisibility()
    ) {
      return;
    }
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  private cancelAnimationFrame() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private readonly handleResize = () => this.resize();

  private readonly handleVisibilityChange = () => {
    if (this.shouldPauseForVisibility()) {
      this.cancelAnimationFrame();
    } else {
      this.scheduleAnimationFrame();
    }
  };

  private shouldPauseForVisibility() {
    return this.pauseWhenHidden && document.hidden;
  }

  private attachBrowserListeners() {
    if (this.autoResize) {
      window.addEventListener("resize", this.handleResize);
    }
    if (this.pauseWhenHidden) {
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }
  }

  private detachBrowserListeners() {
    window.removeEventListener("resize", this.handleResize);
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
  }

  step(): PerfMap {
    const performance = this.simulation.step(true);
    if (!performance) {
      throw new Error("Missing simulation performance sample");
    }
    return this.simulationPerformanceMap(performance);
  }

  draw() {
    if (!this.rc) {
      throw new Error("Instance not setup");
    }

    // Clear background first
    this.rc.background(
      this.renderParams.backgroundColor.h,
      this.renderParams.backgroundColor.s,
      this.renderParams.backgroundColor.b,
    );

    // Render flow field (behind motes)
    this.flowFieldRenderer.render(this.rc);

    // Render motes on top
    const state = this.simulation.view();
    this.moteRenderer.render(
      state.moteX,
      state.moteY,
      state.motePressure,
      this.rc,
    );
  }

  private logPerformance() {
    const step = this.simulation.view().step;

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

  private simulationPerformanceMap(
    performance: SimulationPerformance,
  ): PerfMap {
    return new Map([
      ["simulate", performance.simulateMs],
      ["simulate/flowField", performance.flowFieldMs],
      ["simulate/reset", performance.resetMs],
      ["simulate/processCollisions", performance.collisionMs],
      ["simulate/moveMotes", performance.moveMotesMs],
      ["simulate/nCollisions", performance.collisionCount / 1000],
    ]);
  }

  private performanceMap(sample: PerformanceSample): PerfMap {
    const perf = this.simulationPerformanceMap(sample);
    perf.set("frameGap", sample.frameIntervalMs);
    perf.set("frame", sample.frameMs);
    perf.set("render", sample.renderMs);
    return perf;
  }
}
