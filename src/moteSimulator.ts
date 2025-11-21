import { DynamicFlowField } from "./flowField.js";
import { PerfMap } from "./perfBuffer.js";
import { Rng, makeSeededRng } from "./safeRandom.js";
import { Spec } from "./spec.js";
import { Vector } from "./vector.js";

class MoteSimulator {
  private rng: Rng;
  private xMax: number;
  private yMax: number;

  private nMotes: number;
  public motes: Float32Array;
  private velocities: Float32Array;
  private flowField: DynamicFlowField;
  private spec: Spec;
  public stepCounter = 0;

  // Grid using flat arrays instead of Map for better performance
  private grid: Int32Array;
  private gridSize: number;
  private gridWidth: number;
  private gridHeight: number;
  private gridCellIndices: Uint32Array; // Track where each cell starts
  private gridCellCounts: Uint32Array; // Track count per cell

  // Pre-computed neighbor offsets for collision detection
  private static readonly NEIGHBOR_OFFSETS = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
  ] as const;

  constructor(spec: Spec, seed: string, xDim: number, yDim: number) {
    this.spec = spec;
    this.xMax = xDim;
    this.yMax = yDim;
    this.rng = makeSeededRng(seed);
    this.flowField = new DynamicFlowField(this.rng, new Vector(xDim, yDim));

    this.nMotes = spec.numMotes;
    this.motes = new Float32Array(this.nMotes * 4); // x, y, nCollisions, stepAdded
    this.velocities = new Float32Array(this.nMotes * 2); // vx, vy

    // Setup grid for spatial hashing
    this.gridSize = this.spec.moteRadius * 2;
    this.gridWidth = Math.ceil(xDim / this.gridSize);
    this.gridHeight = Math.ceil(yDim / this.gridSize);
    const gridCellCount = this.gridWidth * this.gridHeight;
    this.grid = new Int32Array(this.nMotes); // Stores mote indices
    this.gridCellIndices = new Uint32Array(gridCellCount + 1);
    this.gridCellCounts = new Uint32Array(gridCellCount);

    // Initialize mote positions randomly
    for (let i = 0; i < this.nMotes; i++) {
      this.motes[i * 4] = this.rng.uniform(0, this.xMax);
      this.motes[i * 4 + 1] = this.rng.uniform(0, this.yMax);
      this.motes[i * 4 + 2] = 0; // Initialize collision count to 0
      this.motes[i * 4 + 3] = 0; // Initialize step-added-on to 0
    }
  }

  step(): PerfMap {
    const perf = new Map<string, number>();
    const stepStart = performance.now();

    this.flowField.step(); // Update the flow field
    this.reset(); // Reset mote colllision velocities and collision counts

    const collisionsStart = performance.now();
    this.processCollisions(); // Compute collision velocity and count for each mote
    perf.set("simulate/processCollisions", performance.now() - collisionsStart);

    this.moveMotes(); // Move motes based on collision velocities and flow field

    perf.set("simulate", performance.now() - stepStart);
    this.stepCounter++;

    return perf;
  }

  reset(): void {
    for (let i = 0; i < this.nMotes; i++) {
      // Check if the mote is out of bounds
      if (
        this.motes[i * 4] < 0 ||
        this.motes[i * 4] >= this.xMax ||
        this.motes[i * 4 + 1] < 0 ||
        this.motes[i * 4 + 1] >= this.yMax
      ) {
        // Assign a random position in-bounds
        this.motes[i * 4] = this.rng.uniform(0, this.xMax);
        this.motes[i * 4 + 1] = this.rng.uniform(0, this.yMax);
        this.motes[i * 4 + 3] = this.stepCounter;
      }
      this.motes[i * 4 + 2] = 0; // Reset collision count
      this.velocities[i * 2] = 0; // Reset x velocity
      this.velocities[i * 2 + 1] = 0; // Reset y velocity
    }
  }

  processCollisions(): void {
    const radiusSq = this.spec.moteRadius * this.spec.moteRadius;
    const gridSize = this.gridSize;
    const gridWidth = this.gridWidth;
    const gridHeight = this.gridHeight;
    const motes = this.motes;
    const grid = this.grid;
    const gridCellCounts = this.gridCellCounts;
    const gridCellIndices = this.gridCellIndices;

    // Clear grid counts
    gridCellCounts.fill(0);

    // Count motes per cell
    for (let i = 0; i < this.nMotes; i++) {
      const cellX = Math.floor(motes[i * 4] / gridSize);
      const cellY = Math.floor(motes[i * 4 + 1] / gridSize);
      const cellIdx = cellY * gridWidth + cellX;
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

    // Place motes into grid
    for (let i = 0; i < this.nMotes; i++) {
      const cellX = Math.floor(motes[i * 4] / gridSize);
      const cellY = Math.floor(motes[i * 4 + 1] / gridSize);
      const cellIdx = cellY * gridWidth + cellX;
      const insertPos = gridCellIndices[cellIdx] + gridCellCounts[cellIdx];
      grid[insertPos] = i;
      gridCellCounts[cellIdx]++;
    }

    // Iterate through all cells
    for (let cellY = 0; cellY < gridHeight; cellY++) {
      for (let cellX = 0; cellX < gridWidth; cellX++) {
        const cellIdx = cellY * gridWidth + cellX;
        const cellStart = gridCellIndices[cellIdx];
        const cellEnd = cellStart + gridCellCounts[cellIdx];

        // Skip empty cells
        if (cellStart === cellEnd) continue;

        // Check collisions with all 9 neighbor cells (including self)
        for (let n = 0; n < 9; n++) {
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

          // Check all mote pairs between cells
          for (let i = cellStart; i < cellEnd; i++) {
            const moteA = grid[i];
            for (let j = neighborStart; j < neighborEnd; j++) {
              const moteB = grid[j];

              // Avoid duplicate checks and self-collision
              if (moteA >= moteB) continue;

              const deltaX = motes[moteB * 4] - motes[moteA * 4];
              const deltaY = motes[moteB * 4 + 1] - motes[moteA * 4 + 1];
              const dsq = deltaX * deltaX + deltaY * deltaY;

              if (dsq < radiusSq) {
                const d = Math.sqrt(dsq);
                this.collide(moteA, moteB, d, deltaX, deltaY);
              }
            }
          }
        }
      }
    }
  }

  moveMotes() {
    for (let i = 0; i < this.nMotes; i++) {
      // Compute the flow field vector for the mote
      let flowVector = this.flowField.flow(
        new Vector(this.motes[i * 4], this.motes[i * 4 + 1])
      );

      // Scale the magnitude of the flow field vector
      const nCollisions = this.motes[i * 4 + 2];
      const flowCoefficient = Math.pow(
        this.spec.cxFlowCoefficient,
        nCollisions
      );
      flowVector = flowVector.mult(this.spec.flowCoefficient * flowCoefficient);

      // Update the mote position based on the flow field vector and the aggregate collision vector
      this.motes[i * 4] += flowVector.x + this.velocities[i * 2];
      this.motes[i * 4 + 1] += flowVector.y + this.velocities[i * 2 + 1];
    }
  }

  /**
   * Handles collision between two motes by computing repulsion forces and updating velocities.
   * Forces are calculated based on distance and applied along the vector connecting the two motes.
   *
   * @param aIndex - Index of the first mote
   * @param bIndex - Index of the second mote
   * @param distance - Distance between the two motes
   * @param deltaX - X component of the vector from mote A to mote B
   * @param deltaY - Y component of the vector from mote A to mote B
   */
  private collide(
    aIndex: number,
    bIndex: number,
    distance: number,
    deltaX: number,
    deltaY: number
  ): void {
    let forceFactor = this.spec.moteForce;
    if (distance >= this.spec.moteRadius - this.spec.moteCollisionDecay) {
      forceFactor =
        (this.spec.moteForce * (this.spec.moteRadius - distance)) /
        this.spec.moteCollisionDecay;
    }

    // Calculate normalized force vector directly without creating Vector objects
    const magnitude = distance > 0 ? forceFactor / distance : 0;
    const forceX = deltaX * magnitude;
    const forceY = deltaY * magnitude;

    this.velocities[aIndex * 2] -= forceX;
    this.velocities[aIndex * 2 + 1] -= forceY;
    this.velocities[bIndex * 2] += forceX;
    this.velocities[bIndex * 2 + 1] += forceY;

    // Increment collision counts
    this.motes[aIndex * 4 + 2]++;
    this.motes[bIndex * 4 + 2]++;
  }
}

export { MoteSimulator };
