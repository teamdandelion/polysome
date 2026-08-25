import type { PerformanceSample } from "../../src/index.ts";

type BenchmarkOptions = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  seed: string;
  durationSeconds: number;
  warmupSeconds: number;
  targetFps: number;
  maxPixelRatio: number;
  numMotes: number;
  xDim: number;
  yDim: number;
};

const METRICS = [
  "frameMs",
  "frameIntervalMs",
  "renderMs",
  "simulateMs",
  "flowFieldMs",
  "resetMs",
  "collisionMs",
  "moveMotesMs",
  "collisionCount",
] as const;

type Metric = (typeof METRICS)[number];

type MetricSummary = {
  mean: number;
  p50: number;
  p95: number;
  max: number;
};

function round(value: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function summarize(
  values: Float32Array,
  count: number,
  start = 0,
): MetricSummary {
  const sorted = Array.from(values.subarray(start, count)).sort(
    (a, b) => a - b,
  );
  let sum = 0;
  for (const value of sorted) sum += value;

  const percentile = (fraction: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ??
    0;

  return {
    mean: round(sorted.length === 0 ? 0 : sum / sorted.length),
    p50: round(percentile(0.5)),
    p95: round(percentile(0.95)),
    max: round(sorted.at(-1) ?? 0),
  };
}

function meanRange(values: Float32Array, start: number, end: number): number {
  if (end <= start) return 0;
  let sum = 0;
  for (let index = start; index < end; index++) sum += values[index];
  return sum / (end - start);
}

function requireElement<T extends Element>(root: Element, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Benchmark panel is missing ${selector}`);
  return element;
}

export function createBenchmark(options: BenchmarkOptions) {
  const panel = requireElement<HTMLElement>(
    options.root,
    "[data-benchmark-panel]",
  );
  const status = requireElement<HTMLElement>(panel, "[data-benchmark-status]");
  const progress = requireElement<HTMLProgressElement>(
    panel,
    "[data-benchmark-progress]",
  );
  const fpsValue = requireElement<HTMLElement>(panel, "[data-benchmark-fps]");
  const workValue = requireElement<HTMLElement>(panel, "[data-benchmark-work]");
  const simulationValue = requireElement<HTMLElement>(
    panel,
    "[data-benchmark-simulation]",
  );
  const collisionValue = requireElement<HTMLElement>(
    panel,
    "[data-benchmark-collision]",
  );
  const renderValue = requireElement<HTMLElement>(
    panel,
    "[data-benchmark-render]",
  );
  const lateValue = requireElement<HTMLElement>(panel, "[data-benchmark-late]");
  const copyButton = requireElement<HTMLButtonElement>(
    panel,
    "[data-benchmark-copy]",
  );
  const reportOutput = requireElement<HTMLElement>(
    panel,
    "[data-benchmark-report]",
  );

  const capacity = Math.ceil(options.durationSeconds * 130) + 1;
  const values = Object.fromEntries(
    METRICS.map((metric) => [metric, new Float32Array(capacity)]),
  ) as Record<Metric, Float32Array>;
  const sums = Object.fromEntries(
    METRICS.map((metric) => [metric, 0]),
  ) as Record<Metric, number>;

  const budgetMs = 1000 / options.targetFps;
  let firstTimestamp: number | null = null;
  let measurementStart: number | null = null;
  let sampleCount = 0;
  let lateFrameCount = 0;
  let overBudgetWorkCount = 0;
  let lastUiUpdate = 0;
  let finished = false;
  let invalidReason: string | null = null;
  let report = "";

  progress.max = options.durationSeconds;
  progress.value = 0;
  panel.hidden = false;
  status.textContent = `Warming up for ${options.warmupSeconds}s`;

  const updateLive = (elapsedSeconds: number) => {
    const intervalCount = Math.max(0, sampleCount - 1);
    const meanInterval =
      intervalCount === 0 ? 0 : sums.frameIntervalMs / intervalCount;
    fpsValue.textContent =
      meanInterval === 0 ? "—" : (1000 / meanInterval).toFixed(1);
    workValue.textContent =
      sampleCount === 0 ? "—" : `${(sums.frameMs / sampleCount).toFixed(2)} ms`;
    simulationValue.textContent =
      sampleCount === 0
        ? "—"
        : `${(sums.simulateMs / sampleCount).toFixed(2)} ms`;
    collisionValue.textContent =
      sampleCount === 0
        ? "—"
        : `${(sums.collisionMs / sampleCount).toFixed(2)} ms`;
    renderValue.textContent =
      sampleCount === 0
        ? "—"
        : `${(sums.renderMs / sampleCount).toFixed(2)} ms`;
    lateValue.textContent =
      intervalCount === 0
        ? "—"
        : `${((lateFrameCount / intervalCount) * 100).toFixed(1)}%`;
    progress.value = Math.min(options.durationSeconds, elapsedSeconds);
  };

  const finish = () => {
    if (finished) return;
    finished = true;

    const summaries = Object.fromEntries(
      METRICS.map((metric) => [
        metric,
        summarize(
          values[metric],
          sampleCount,
          metric === "frameIntervalMs" ? 1 : 0,
        ),
      ]),
    );
    const intervalCount = Math.max(0, sampleCount - 1);
    const windowSize = Math.max(1, Math.floor(sampleCount * 0.2));
    const earlyFrameMean = meanRange(values.frameMs, 0, windowSize);
    const lateFrameMean = meanRange(
      values.frameMs,
      Math.max(0, sampleCount - windowSize),
      sampleCount,
    );

    const output = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      valid: invalidReason === null && sampleCount > 0,
      invalidReason,
      benchmark: {
        seed: options.seed,
        warmupSeconds: options.warmupSeconds,
        durationSeconds: options.durationSeconds,
        targetFps: options.targetFps,
        frameBudgetMs: round(budgetMs),
      },
      environment: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        hardwareConcurrency: navigator.hardwareConcurrency ?? null,
        maxTouchPoints: navigator.maxTouchPoints,
        viewportCssPixels: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        screenCssPixels: {
          width: window.screen.width,
          height: window.screen.height,
        },
        devicePixelRatio: window.devicePixelRatio,
        canvasBackingStorePixels: {
          width: options.canvas.width,
          height: options.canvas.height,
        },
      },
      configuration: {
        simulationWidth: round(options.xDim),
        simulationHeight: round(options.yDim),
        numMotes: options.numMotes,
        maxPixelRatio: options.maxPixelRatio,
      },
      results: {
        samples: sampleCount,
        actualFps:
          intervalCount === 0
            ? 0
            : round(1000 / (sums.frameIntervalMs / intervalCount)),
        lateFramePercent:
          intervalCount === 0
            ? 0
            : round((lateFrameCount / intervalCount) * 100),
        overBudgetWorkPercent:
          sampleCount === 0
            ? 0
            : round((overBudgetWorkCount / sampleCount) * 100),
        frameWorkDriftPercent:
          earlyFrameMean === 0
            ? 0
            : round(((lateFrameMean - earlyFrameMean) / earlyFrameMean) * 100),
        metrics: summaries,
      },
    };

    report = JSON.stringify(output, null, 2);
    reportOutput.textContent = report;
    copyButton.disabled = false;
    status.textContent = output.valid
      ? `${options.durationSeconds}s benchmark complete`
      : `Invalid run: ${invalidReason ?? "no samples"}`;
    updateLive(options.durationSeconds);
  };

  const record = (sample: PerformanceSample) => {
    if (finished) return;
    firstTimestamp ??= sample.timestamp;

    const warmupElapsed = (sample.timestamp - firstTimestamp) / 1000;
    if (warmupElapsed < options.warmupSeconds) {
      if (sample.timestamp - lastUiUpdate >= 500) {
        status.textContent = `Warming up — ${Math.max(
          0,
          options.warmupSeconds - warmupElapsed,
        ).toFixed(1)}s`;
        lastUiUpdate = sample.timestamp;
      }
      return;
    }

    measurementStart ??= sample.timestamp;
    const elapsedSeconds = (sample.timestamp - measurementStart) / 1000;

    if (sampleCount >= capacity) {
      invalidReason = "sample capacity exceeded";
      finish();
      return;
    }

    for (const metric of METRICS) {
      const value = sample[metric];
      values[metric][sampleCount] = value;
      if (!(metric === "frameIntervalMs" && sampleCount === 0)) {
        sums[metric] += value;
      }
    }

    if (sampleCount > 0 && sample.frameIntervalMs > budgetMs * 1.5) {
      lateFrameCount++;
    }
    if (sample.frameMs > budgetMs) overBudgetWorkCount++;
    sampleCount++;

    if (sample.timestamp - lastUiUpdate >= 500) {
      status.textContent = `Measuring — ${Math.min(
        options.durationSeconds,
        elapsedSeconds,
      ).toFixed(1)} / ${options.durationSeconds}s`;
      updateLive(elapsedSeconds);
      lastUiUpdate = sample.timestamp;
    }

    if (elapsedSeconds >= options.durationSeconds) finish();
  };

  const handleVisibility = () => {
    if (document.hidden && !finished) {
      invalidReason = "page was hidden during the benchmark";
      finish();
    }
  };

  document.addEventListener("visibilitychange", handleVisibility);
  copyButton.addEventListener("click", async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      copyButton.textContent = "Copied";
    } catch {
      reportOutput.closest("details")?.setAttribute("open", "");
      copyButton.textContent = "Select JSON below";
    }
  });

  return {
    record,
    destroy() {
      document.removeEventListener("visibilitychange", handleVisibility);
    },
  };
}
