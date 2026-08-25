import { SimulationParams } from "./simulationParams.ts";
import { RenderParams } from "./renderParams.ts";
import { Vector } from "./vector.ts";
import { makeSeededRng, Rng } from "./random.ts";
import { RenderContext } from "./renderContext.ts";
import { MoteRenderer } from "./moteRenderer.ts";
import { MoteSimulator } from "./moteSimulator.ts";
import { FlowFieldRenderer } from "./flowFieldRenderer.ts";
import { PerfBuffer, PerfMap } from "./perfBuffer.ts";

const PERF_TEMPLATE =
  "frame=$frame frameGap=$frameGap render=$render simulate=$simulate\n  flowField=$simulate/flowField reset=$simulate/reset processCollisions=$simulate/processCollisions moveMotes=$simulate/moveMotes\n  nCollisions=$simulate/nCollisions";

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
};

export class Instance {
  rng: Rng;
  simParams: SimulationParams;
  renderParams: RenderParams;
  private moteSimulator: MoteSimulator;
  private moteRenderer: MoteRenderer;
  private flowFieldRenderer: FlowFieldRenderer;
  rc: RenderContext | null;
  bounds: Vector;
  private animationFrameId: number | null = null;
  private wantsToRun = false;
  private lastRenderedFrame = 0;
  private lastFrameStart = 0;
  private readonly maxFps: number | undefined;
  private readonly maxPixelRatio: number;
  private readonly autoResize: boolean;
  private readonly pauseWhenHidden: boolean;
  private readonly shouldLogPerformance: boolean;

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
    this.simParams = Object.assign(new SimulationParams(), options.simulation);
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
    this.bounds = new Vector(xDim, yDim);
    this.moteRenderer = new MoteRenderer(
      this.renderParams,
      this.simParams.numMotes,
      this.simParams.moteRadius,
      this.rng,
    );

    this.moteSimulator = new MoteSimulator(this.simParams, seed, xDim, yDim);
    this.flowFieldRenderer = new FlowFieldRenderer(
      this.renderParams,
      this.moteSimulator.flowField,
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
    this.wantsToRun = true;
    this.scheduleAnimationFrame();
  }

  stop() {
    this.wantsToRun = false;
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
    if (
      minimumFrameDuration > 0 &&
      timestamp - this.lastRenderedFrame < minimumFrameDuration
    ) {
      this.scheduleAnimationFrame();
      return;
    }

    const frameStart = performance.now();
    const stepPerf = this.step();

    const renderStart = performance.now();
    this.draw();
    const renderTime = performance.now() - renderStart;
    const frameTime = performance.now() - frameStart;

    if (this.shouldLogPerformance) {
      const perf: PerfMap = new Map(stepPerf);
      perf.set(
        "frameGap",
        this.lastFrameStart === 0 ? 0 : frameStart - this.lastFrameStart,
      );
      perf.set("frame", frameTime);
      perf.set("render", renderTime);
      this.perfBuffer.recordPerf(this.moteSimulator.stepCounter, perf);
      this.logPerformance();
    }

    this.lastRenderedFrame = timestamp;
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
    return this.moteSimulator.step();
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
    this.moteRenderer.render(
      this.moteSimulator.moteX,
      this.moteSimulator.moteY,
      this.moteSimulator.motePressure,
      this.rc,
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
