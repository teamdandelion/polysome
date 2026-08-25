/**
 * Browser-free measurements of a Polysome simulation state.
 *
 * The returned fingerprint contains only JSON values. It is intended to be
 * stored alongside a seed, parameter set, and code revision so runs can be
 * compared without retaining every mote position.
 */

export type MorphologyInput = {
  /** Completed simulation step represented by this state. */
  step: number;
  width: number;
  height: number;
  /** Collision/interaction radius used by the simulation. */
  moteRadius: number;
  moteX: Float32Array;
  moteY: Float32Array;
  /** Per-mote contact counts as recorded in Uint8 storage. */
  motePressure: Uint8Array;
  /** Unsaturated number of interacting pairs observed during this step. */
  collisionPairs: number;
};

export const MORPHOLOGY_METRIC_VERSION = "polysome-morphology-v1" as const;

export type MorphologyOptions = {
  /** Grid cell sizes expressed as multiples of moteRadius. */
  gridCellSizeMultipliers?: readonly number[];
  /** Dense-cell cutoffs expressed as multiples of mean occupancy. */
  denseThresholdMultipliers?: readonly number[];
};

export type DenseComponentMetric = {
  thresholdToMean: number;
  activeCellCount: number;
  activeCellFraction: number;
  componentCount: number;
  /** Cells in the largest component divided by all cells in the grid. */
  largestCellFraction: number;
  /** Motes in the largest component divided by all motes. */
  largestMassFraction: number;
};

export type GridMorphologyMetric = {
  cellSizeToMoteRadius: number;
  requestedCellSize: number;
  columns: number;
  rows: number;
  /** Equal-width bin size after fitting an integer number of columns. */
  actualCellWidth: number;
  /** Equal-height bin size after fitting an integer number of rows. */
  actualCellHeight: number;
  cellCount: number;
  meanMotesPerCell: number;
  densityCoefficientOfVariation: number;
  emptyCellFraction: number;
  normalizedShannonEntropy: number;
  maximumToMeanDensity: number;
  denseComponents: DenseComponentMetric[];
  emptyVoids: {
    componentCount: number;
    /** Cells in the largest void divided by all cells in the grid. */
    largestCellFraction: number;
  };
};

export type MorphologyFingerprint = {
  schemaVersion: 1;
  metricVersion: typeof MORPHOLOGY_METRIC_VERSION;
  step: number;
  domain: {
    width: number;
    height: number;
    moteRadius: number;
  };
  moteCount: number;
  contacts: {
    collisionPairs: number;
    meanContactsPerMote: number;
    /**
     * (N - 1) pi R^2 / area, capped at N - 1. This is a nominal infinite-plane
     * reference and intentionally does not correct for rectangular boundaries.
     */
    nominalUniformMeanContacts: number;
    /** Observed mean contacts divided by the nominal uniform reference. */
    nominalUniformContactRatio: number | null;
  };
  pressure: {
    mean: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
    /**
     * Fraction recorded at the maximum Uint8 value. This is a useful overflow
     * warning, but cannot identify counters that have already wrapped to zero.
     */
    fractionAt255: number;
  };
  geometry: {
    centroid: { x: number; y: number } | null;
    radiusOfGyration: number | null;
    covariance: {
      xx: number;
      xy: number;
      yy: number;
      majorEigenvalue: number;
      minorEigenvalue: number;
      /** (major - minor) / (major + minor), from 0 isotropic to 1 linear. */
      anisotropy: number;
    } | null;
  };
  grids: GridMorphologyMetric[];
};

const DEFAULT_GRID_MULTIPLIERS = [0.5, 1, 2, 4] as const;
const DEFAULT_DENSE_THRESHOLDS = [1, 1.5, 2, 3] as const;

type ComponentSummary = {
  componentCount: number;
  largestCellCount: number;
  largestMass: number;
};

/**
 * Measure clustering, voids, pressure, and global shape without accessing the
 * DOM or changing the supplied typed arrays.
 */
export function measureMorphology(
  input: MorphologyInput,
  options: MorphologyOptions = {},
): MorphologyFingerprint {
  const moteCount = validateInput(input);
  const gridMultipliers = validatePositiveList(
    options.gridCellSizeMultipliers ?? DEFAULT_GRID_MULTIPLIERS,
    "gridCellSizeMultipliers",
  );
  const denseThresholds = validatePositiveList(
    options.denseThresholdMultipliers ?? DEFAULT_DENSE_THRESHOLDS,
    "denseThresholdMultipliers",
  );

  const meanContactsPerMote =
    moteCount === 0 ? 0 : (2 * input.collisionPairs) / moteCount;
  const interactionAreaFraction = Math.min(
    1,
    (Math.PI * input.moteRadius * input.moteRadius) /
      (input.width * input.height),
  );
  const nominalUniformMeanContacts =
    moteCount <= 1 ? 0 : (moteCount - 1) * interactionAreaFraction;

  return {
    schemaVersion: 1,
    metricVersion: MORPHOLOGY_METRIC_VERSION,
    step: input.step,
    domain: {
      width: input.width,
      height: input.height,
      moteRadius: input.moteRadius,
    },
    moteCount,
    contacts: {
      collisionPairs: input.collisionPairs,
      meanContactsPerMote,
      nominalUniformMeanContacts,
      nominalUniformContactRatio:
        nominalUniformMeanContacts === 0
          ? null
          : meanContactsPerMote / nominalUniformMeanContacts,
    },
    pressure: measurePressure(input.motePressure),
    geometry: measureGeometry(input.moteX, input.moteY),
    grids: gridMultipliers.map((multiplier) =>
      measureGrid(input, multiplier, denseThresholds, moteCount),
    ),
  };
}

function validateInput(input: MorphologyInput): number {
  if (!Number.isSafeInteger(input.step) || input.step < 0) {
    throw new RangeError("step must be a non-negative safe integer");
  }

  validatePositiveFinite(input.width, "width");
  validatePositiveFinite(input.height, "height");
  validatePositiveFinite(input.moteRadius, "moteRadius");

  const moteCount = input.moteX.length;
  if (
    input.moteY.length !== moteCount ||
    input.motePressure.length !== moteCount
  ) {
    throw new RangeError(
      "moteX, moteY, and motePressure must have identical lengths",
    );
  }

  if (!Number.isSafeInteger(input.collisionPairs) || input.collisionPairs < 0) {
    throw new RangeError("collisionPairs must be a non-negative safe integer");
  }

  const maximumPairs = (moteCount * (moteCount - 1)) / 2;
  if (input.collisionPairs > maximumPairs) {
    throw new RangeError(
      "collisionPairs cannot exceed the number of unique mote pairs",
    );
  }

  for (let i = 0; i < moteCount; i++) {
    if (!Number.isFinite(input.moteX[i]) || !Number.isFinite(input.moteY[i])) {
      throw new RangeError(`mote position at index ${i} must be finite`);
    }
  }

  return moteCount;
}

function validatePositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
}

function validatePositiveList(
  values: readonly number[],
  name: string,
): readonly number[] {
  if (values.length === 0) {
    throw new RangeError(`${name} must contain at least one value`);
  }

  for (let i = 0; i < values.length; i++) {
    validatePositiveFinite(values[i], `${name}[${i}]`);
  }
  return values;
}

function measurePressure(
  pressure: Uint8Array,
): MorphologyFingerprint["pressure"] {
  if (pressure.length === 0) {
    return {
      mean: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      max: 0,
      fractionAt255: 0,
    };
  }

  const histogram = new Uint32Array(256);
  let sum = 0;
  let max = 0;
  for (let i = 0; i < pressure.length; i++) {
    const value = pressure[i];
    histogram[value]++;
    sum += value;
    if (value > max) max = value;
  }

  return {
    mean: sum / pressure.length,
    p50: histogramQuantile(histogram, pressure.length, 0.5),
    p95: histogramQuantile(histogram, pressure.length, 0.95),
    p99: histogramQuantile(histogram, pressure.length, 0.99),
    max,
    fractionAt255: histogram[255] / pressure.length,
  };
}

/** Empirical inverse CDF (nearest-rank quantile). */
function histogramQuantile(
  histogram: Uint32Array,
  sampleCount: number,
  quantile: number,
): number {
  const rank = Math.ceil(sampleCount * quantile);
  let cumulative = 0;
  for (let value = 0; value < histogram.length; value++) {
    cumulative += histogram[value];
    if (cumulative >= rank) return value;
  }
  return 255;
}

function measureGeometry(
  moteX: Float32Array,
  moteY: Float32Array,
): MorphologyFingerprint["geometry"] {
  const moteCount = moteX.length;
  if (moteCount === 0) {
    return {
      centroid: null,
      radiusOfGyration: null,
      covariance: null,
    };
  }

  let centroidX = 0;
  let centroidY = 0;
  for (let i = 0; i < moteCount; i++) {
    centroidX += moteX[i];
    centroidY += moteY[i];
  }
  centroidX /= moteCount;
  centroidY /= moteCount;

  let covarianceXX = 0;
  let covarianceXY = 0;
  let covarianceYY = 0;
  for (let i = 0; i < moteCount; i++) {
    const dx = moteX[i] - centroidX;
    const dy = moteY[i] - centroidY;
    covarianceXX += dx * dx;
    covarianceXY += dx * dy;
    covarianceYY += dy * dy;
  }
  covarianceXX /= moteCount;
  covarianceXY /= moteCount;
  covarianceYY /= moteCount;

  const trace = covarianceXX + covarianceYY;
  const eigenvalueDifference = Math.sqrt(
    (covarianceXX - covarianceYY) ** 2 + 4 * covarianceXY ** 2,
  );
  const majorEigenvalue = Math.max(0, (trace + eigenvalueDifference) / 2);
  const minorEigenvalue = Math.max(0, (trace - eigenvalueDifference) / 2);

  return {
    centroid: { x: centroidX, y: centroidY },
    radiusOfGyration: Math.sqrt(Math.max(0, trace)),
    covariance: {
      xx: covarianceXX,
      xy: covarianceXY,
      yy: covarianceYY,
      majorEigenvalue,
      minorEigenvalue,
      anisotropy: trace === 0 ? 0 : Math.min(1, eigenvalueDifference / trace),
    },
  };
}

function measureGrid(
  input: MorphologyInput,
  cellSizeMultiplier: number,
  denseThresholds: readonly number[],
  moteCount: number,
): GridMorphologyMetric {
  const requestedCellSize = input.moteRadius * cellSizeMultiplier;
  const columns = Math.max(1, Math.ceil(input.width / requestedCellSize));
  const rows = Math.max(1, Math.ceil(input.height / requestedCellSize));
  const cellCount = columns * rows;
  if (!Number.isSafeInteger(cellCount)) {
    throw new RangeError("requested grid contains too many cells");
  }

  const cellCounts = new Uint32Array(cellCount);
  for (let i = 0; i < moteCount; i++) {
    // A mote can cross an edge during moveMotes and is only respawned on the
    // following step. Assign that transient state to the nearest edge bin.
    const normalizedX = clamp(input.moteX[i] / input.width, 0, 1);
    const normalizedY = clamp(input.moteY[i] / input.height, 0, 1);
    const cellX = Math.min(columns - 1, Math.floor(normalizedX * columns));
    const cellY = Math.min(rows - 1, Math.floor(normalizedY * rows));
    cellCounts[cellY * columns + cellX]++;
  }

  const meanMotesPerCell = moteCount / cellCount;
  let squaredCountSum = 0;
  let emptyCellCount = 0;
  let maximumCount = 0;
  let entropy = 0;
  for (let i = 0; i < cellCount; i++) {
    const count = cellCounts[i];
    squaredCountSum += count * count;
    if (count === 0) emptyCellCount++;
    if (count > maximumCount) maximumCount = count;
    if (count > 0 && moteCount > 0) {
      const probability = count / moteCount;
      entropy -= probability * Math.log(probability);
    }
  }

  const densityVariance = Math.max(
    0,
    squaredCountSum / cellCount - meanMotesPerCell * meanMotesPerCell,
  );
  const normalizedShannonEntropy =
    moteCount === 0 ? 0 : cellCount === 1 ? 1 : entropy / Math.log(cellCount);

  const denseComponents = denseThresholds.map((thresholdToMean) => {
    const threshold = thresholdToMean * meanMotesPerCell;
    const active = new Uint8Array(cellCount);
    let activeCellCount = 0;
    if (moteCount > 0) {
      for (let i = 0; i < cellCount; i++) {
        if (cellCounts[i] >= threshold) {
          active[i] = 1;
          activeCellCount++;
        }
      }
    }

    const components = measureComponents(active, cellCounts, columns, rows);
    return {
      thresholdToMean,
      activeCellCount,
      activeCellFraction: activeCellCount / cellCount,
      componentCount: components.componentCount,
      largestCellFraction: components.largestCellCount / cellCount,
      largestMassFraction:
        moteCount === 0 ? 0 : components.largestMass / moteCount,
    };
  });

  const emptyCells = new Uint8Array(cellCount);
  for (let i = 0; i < cellCount; i++) {
    if (cellCounts[i] === 0) emptyCells[i] = 1;
  }
  const emptyComponents = measureComponents(
    emptyCells,
    cellCounts,
    columns,
    rows,
  );

  return {
    cellSizeToMoteRadius: cellSizeMultiplier,
    requestedCellSize,
    columns,
    rows,
    actualCellWidth: input.width / columns,
    actualCellHeight: input.height / rows,
    cellCount,
    meanMotesPerCell,
    densityCoefficientOfVariation:
      meanMotesPerCell === 0
        ? 0
        : Math.sqrt(densityVariance) / meanMotesPerCell,
    emptyCellFraction: emptyCellCount / cellCount,
    normalizedShannonEntropy,
    maximumToMeanDensity:
      meanMotesPerCell === 0 ? 0 : maximumCount / meanMotesPerCell,
    denseComponents,
    emptyVoids: {
      componentCount: emptyComponents.componentCount,
      largestCellFraction: emptyComponents.largestCellCount / cellCount,
    },
  };
}

function measureComponents(
  active: Uint8Array,
  mass: Uint32Array,
  columns: number,
  rows: number,
): ComponentSummary {
  const visited = new Uint8Array(active.length);
  const stack = new Int32Array(active.length);
  let componentCount = 0;
  let largestCellCount = 0;
  let largestMass = 0;

  for (let start = 0; start < active.length; start++) {
    if (active[start] === 0 || visited[start] !== 0) continue;

    componentCount++;
    let stackLength = 1;
    stack[0] = start;
    visited[start] = 1;
    let componentCellCount = 0;
    let componentMass = 0;

    while (stackLength > 0) {
      const cell = stack[--stackLength];
      componentCellCount++;
      componentMass += mass[cell];
      const cellY = Math.floor(cell / columns);
      const cellX = cell - cellY * columns;

      const yStart = Math.max(0, cellY - 1);
      const yEnd = Math.min(rows - 1, cellY + 1);
      const xStart = Math.max(0, cellX - 1);
      const xEnd = Math.min(columns - 1, cellX + 1);
      for (let neighborY = yStart; neighborY <= yEnd; neighborY++) {
        for (let neighborX = xStart; neighborX <= xEnd; neighborX++) {
          const neighbor = neighborY * columns + neighborX;
          if (active[neighbor] !== 0 && visited[neighbor] === 0) {
            visited[neighbor] = 1;
            stack[stackLength++] = neighbor;
          }
        }
      }
    }

    if (componentCellCount > largestCellCount) {
      largestCellCount = componentCellCount;
    }
    if (componentMass > largestMass) largestMass = componentMass;
  }

  return { componentCount, largestCellCount, largestMass };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
