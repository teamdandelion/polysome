import { FlowField } from "./flowField.ts";
import { PerfMap } from "./perfBuffer.ts";
import { Rng, makeSeededRng } from "./random.ts";
import { Spec } from "./spec.ts";
import { Vector } from "./vector.ts";

class MoteSimulator {
  private rng: Rng;
  private xMax: number;
  private yMax: number;

  private nMotes: number;
  public moteX: Float32Array;
  public moteY: Float32Array;
  public motePressure: Uint8Array;
  private moteVelocityX: Float32Array;
  private moteVelocityY: Float32Array;
  private flowField: FlowField;
  private spec: Spec;
  public stepCounter = 0;

  // Grid using flat arrays instead of Map for better performance
  private grid: Int32Array;
  private gridSize: number;
  private gridWidth: number;
  private gridHeight: number;
  private gridCellIndices: Uint32Array; // Track where each cell starts
  private gridCellCounts: Uint32Array; // Track count per cell
  private moteCellIndices: Uint32Array; // Cache pre-computed cell index for each mote

  // Pre-computed neighbor offsets for collision detection
  // Only include "upper/right half" to avoid duplicate pair checks
  // Self-cell [0,0] handled specially with i < j check
  private static readonly NEIGHBOR_OFFSETS = [
    [1, 0], // right
    [0, 1], // down
    [1, 1], // down-right
    [-1, 1], // down-left
  ] as const;

  constructor(spec: Spec, seed: string, xDim: number, yDim: number) {
    this.spec = spec;
    this.xMax = xDim;
    this.yMax = yDim;
    this.rng = makeSeededRng(seed);
    this.flowField = new FlowField(this.rng, spec, new Vector(xDim, yDim));

    this.nMotes = spec.numMotes;
    this.moteX = new Float32Array(this.nMotes);
    this.moteY = new Float32Array(this.nMotes);
    this.motePressure = new Uint8Array(this.nMotes);
    this.moteVelocityX = new Float32Array(this.nMotes);
    this.moteVelocityY = new Float32Array(this.nMotes);

    // Setup grid for spatial hashing
    this.gridSize = this.spec.moteRadius * 2;
    this.gridWidth = Math.ceil(xDim / this.gridSize);
    this.gridHeight = Math.ceil(yDim / this.gridSize);
    const gridCellCount = this.gridWidth * this.gridHeight;
    this.grid = new Int32Array(this.nMotes); // Stores mote indices
    this.gridCellIndices = new Uint32Array(gridCellCount + 1);
    this.gridCellCounts = new Uint32Array(gridCellCount);
    this.moteCellIndices = new Uint32Array(this.nMotes); // Cache cell indices

    // Initialize mote positions on edges
    for (let i = 0; i < this.nMotes; i++) {
      const pos = this.placeOnEdge();
      this.moteX[i] = pos.x;
      this.moteY[i] = pos.y;
    }
  }

  step(): PerfMap {
    const perf = new Map<string, number>();
    const stepStart = performance.now();

    const flowFieldStart = performance.now();
    this.flowField.step(); // Update the flow field
    perf.set("simulate/flowField", performance.now() - flowFieldStart);

    const resetStart = performance.now();
    this.reset(); // Reset mote colllision velocities and collision counts
    perf.set("simulate/reset", performance.now() - resetStart);

    const collisionsStart = performance.now();
    const nCollisions = this.computePressure(); // Compute collision velocity and count for each mote
    perf.set("simulate/processCollisions", performance.now() - collisionsStart);
    perf.set("simulate/nCollisions", nCollisions / 1000);

    const moveStart = performance.now();
    this.moveMotes(); // Move motes based on collision velocities and flow field
    perf.set("simulate/moveMotes", performance.now() - moveStart);

    perf.set("simulate", performance.now() - stepStart);
    this.stepCounter++;

    return perf;
  }

  reset(): void {
    // Reset collision counts and velocities for all motes
    this.motePressure.fill(0);
    this.moteVelocityX.fill(0);
    this.moteVelocityY.fill(0);

    // Check for out-of-bounds motes and reset positions
    for (let i = 0; i < this.nMotes; i++) {
      if (
        this.moteX[i] < 0 ||
        this.moteX[i] >= this.xMax ||
        this.moteY[i] < 0 ||
        this.moteY[i] >= this.yMax
      ) {
        // Assign a random position on edge
        const pos = this.placeOnEdge();
        this.moteX[i] = pos.x;
        this.moteY[i] = pos.y;
      }
    }
  }

  computePressure(): number {
    const radiusSq = this.spec.moteRadius * this.spec.moteRadius;
    const gridSize = this.gridSize;
    const invGridSize = 1 / gridSize;
    const gridWidth = this.gridWidth;
    const gridHeight = this.gridHeight;
    const moteX = this.moteX;
    const moteY = this.moteY;
    const motePressure = this.motePressure;
    const moteVelocityX = this.moteVelocityX;
    const moteVelocityY = this.moteVelocityY;
    const grid = this.grid;
    const gridCellCounts = this.gridCellCounts;
    const gridCellIndices = this.gridCellIndices;
    const spec = this.spec;
    let nCollisions = 0;

    gridCellCounts.fill(0);

    const moteCellIndices = this.moteCellIndices;

    // Count motes per cell and cache cell indices (compute once, use twice)
    for (let i = 0; i < this.nMotes; i++) {
      const cellX = (moteX[i] * invGridSize) | 0;
      const cellY = (moteY[i] * invGridSize) | 0;
      const cellIdx = cellY * gridWidth + cellX;
      moteCellIndices[i] = cellIdx; // Cache for reuse
      gridCellCounts[cellIdx]++;
    }

    // Compute cell start indices (prefix sum)
    let sum = 0;
    for (let i = 0; i < gridCellCounts.length; i++) {
      gridCellIndices[i] = sum;
      sum += gridCellCounts[i];
    }
    gridCellIndices[gridCellCounts.length] = sum;

    // Reset counts for insertion
    gridCellCounts.fill(0);

    // Place motes into grid (reuse cached cell indices)
    for (let i = 0; i < this.nMotes; i++) {
      const cellIdx = moteCellIndices[i]; // Reuse cached value!
      const insertPos = gridCellIndices[cellIdx] + gridCellCounts[cellIdx];
      grid[insertPos] = i;
      gridCellCounts[cellIdx]++;
    }

    // Iterate through all cells (flattened loop for better cache locality)
    const gridCellCount = gridWidth * gridHeight;
    for (let cellIdx = 0; cellIdx < gridCellCount; cellIdx++) {
      const cellStart = gridCellIndices[cellIdx];
      const cellEnd = cellStart + gridCellCounts[cellIdx];

      // Skip empty cells
      if (cellStart === cellEnd) continue;

      // Extract cellX and cellY only for neighbor lookups
      const cellY = (cellIdx / gridWidth) | 0;
      const cellX = cellIdx - cellY * gridWidth;

      // 1) Check self-cell pairs (i < j to avoid duplicates)
      for (let idxA = cellStart; idxA < cellEnd; idxA++) {
        const moteA = grid[idxA];
        for (let idxB = idxA + 1; idxB < cellEnd; idxB++) {
          const moteB = grid[idxB];

          const deltaX = moteX[moteB] - moteX[moteA];
          const deltaY = moteY[moteB] - moteY[moteA];
          const dsq = deltaX * deltaX + deltaY * deltaY;

          if (dsq < radiusSq) {
            nCollisions++;
            const d = Math.sqrt(dsq);

            // Inline collision handling
            let forceFactor = spec.moteForce;
            if (d >= spec.moteRadius - spec.moteCollisionDecay) {
              forceFactor =
                (spec.moteForce * (spec.moteRadius - d)) /
                spec.moteCollisionDecay;
            }

            const magnitude = d > 0 ? forceFactor / d : 0;
            const forceX = deltaX * magnitude;
            const forceY = deltaY * magnitude;

            moteVelocityX[moteA] -= forceX;
            moteVelocityY[moteA] -= forceY;
            moteVelocityX[moteB] += forceX;
            moteVelocityY[moteB] += forceY;

            motePressure[moteA]++;
            motePressure[moteB]++;
          }
        }
      }

      // 2) Check collisions with upper/right neighbor cells only (avoids duplicates)
      for (let n = 0; n < 4; n++) {
        const offset = MoteSimulator.NEIGHBOR_OFFSETS[n];
        const neighborX = cellX + offset[0];
        const neighborY = cellY + offset[1];

        // Skip out-of-bounds neighbors
        if (
          neighborX < 0 ||
          neighborX >= gridWidth ||
          neighborY < 0 ||
          neighborY >= gridHeight
        ) {
          continue;
        }

        const neighborIdx = neighborY * gridWidth + neighborX;
        const neighborStart = gridCellIndices[neighborIdx];
        const neighborEnd = neighborStart + gridCellCounts[neighborIdx];

        // Check all mote pairs between cells (no need for moteA >= moteB check)
        for (let i = cellStart; i < cellEnd; i++) {
          const moteA = grid[i];
          for (let j = neighborStart; j < neighborEnd; j++) {
            const moteB = grid[j];

            const deltaX = moteX[moteB] - moteX[moteA];
            const deltaY = moteY[moteB] - moteY[moteA];
            const dsq = deltaX * deltaX + deltaY * deltaY;

            if (dsq < radiusSq) {
              nCollisions++;
              const d = Math.sqrt(dsq);

              // Inline collision handling
              let forceFactor = spec.moteForce;
              if (d >= spec.moteRadius - spec.moteCollisionDecay) {
                forceFactor =
                  (spec.moteForce * (spec.moteRadius - d)) /
                  spec.moteCollisionDecay;
              }

              const magnitude = d > 0 ? forceFactor / d : 0;
              const forceX = deltaX * magnitude;
              const forceY = deltaY * magnitude;

              moteVelocityX[moteA] -= forceX;
              moteVelocityY[moteA] -= forceY;
              moteVelocityX[moteB] += forceX;
              moteVelocityY[moteB] += forceY;

              motePressure[moteA]++;
              motePressure[moteB]++;
            }
          }
        }
      }
    }
    return nCollisions;
  }

  moveMotes() {
    const flowVector = new Vector(0, 0);
    const zone = this.spec.boundaryZone;
    const bForce = this.spec.boundaryForce;
    const bForceMax = this.spec.boundaryForceMax;

    for (let i = 0; i < this.nMotes; i++) {
      const nCollisions = this.motePressure[i];
      const flowCoefficient =
        this.spec.flowCoefficient *
        Math.pow(this.spec.cxFlowCoefficient, nCollisions);

      this.flowField.flow(
        this.moteX[i],
        this.moteY[i],
        flowCoefficient,
        flowVector
      );

      // Apply boundary repulsion forces
      const x = this.moteX[i];
      const y = this.moteY[i];

      let boundaryForceX = 0;
      let boundaryForceY = 0;

      // Left boundary
      if (x < zone) {
        const force = Math.min(bForce * (1 - x / zone), bForceMax);
        boundaryForceX += force;
      }
      // Right boundary
      if (x > this.xMax - zone) {
        const dist = this.xMax - x;
        const force = Math.min(bForce * (1 - dist / zone), bForceMax);
        boundaryForceX -= force;
      }

      // Top boundary
      if (y < zone) {
        const force = Math.min(bForce * (1 - y / zone), bForceMax);
        boundaryForceY += force;
      }
      // Bottom boundary
      if (y > this.yMax - zone) {
        const dist = this.yMax - y;
        const force = Math.min(bForce * (1 - dist / zone), bForceMax);
        boundaryForceY -= force;
      }

      // Update the mote position based on the flow field vector, collision vector, and boundary forces
      this.moteX[i] += flowVector.x + this.moteVelocityX[i] + boundaryForceX;
      this.moteY[i] += flowVector.y + this.moteVelocityY[i] + boundaryForceY;
    }
  }

  private placeOnEdge(): { x: number; y: number } {
    const perimeter = 2 * (this.xMax + this.yMax);
    const t = this.rng.uniform(0, perimeter);
    const inset = this.rng.uniform(0, this.spec.boundarySpawnDepth);

    if (t < this.xMax) {
      // Top edge
      return { x: t, y: inset };
    } else if (t < this.xMax + this.yMax) {
      // Right edge
      return { x: this.xMax - inset, y: t - this.xMax };
    } else if (t < 2 * this.xMax + this.yMax) {
      // Bottom edge
      return { x: this.xMax - (t - this.xMax - this.yMax), y: this.yMax - inset };
    } else {
      // Left edge
      return { x: inset, y: this.yMax - (t - 2 * this.xMax - this.yMax) };
    }
  }
}

export { MoteSimulator };
