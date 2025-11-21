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

  constructor(spec: Spec, seed: string, xDim: number, yDim: number) {
    this.spec = spec;
    this.xMax = xDim;
    this.yMax = yDim;
    this.rng = makeSeededRng(seed);
    this.flowField = new DynamicFlowField(this.rng, new Vector(xDim, yDim));

    this.nMotes = spec.numMotes;
    this.motes = new Float32Array(this.nMotes * 4); // x, y, nCollisions, stepAdded
    this.velocities = new Float32Array(this.nMotes * 2); // vx, vy

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
    const gridSize = this.spec.moteRadius * 2;
    const grid = new Map<string, number[]>();
    const radiusSq = this.spec.moteRadius * this.spec.moteRadius;

    // Populate the grid
    for (let i = 0; i < this.nMotes; i++) {
      const x = Math.floor(this.motes[i * 4] / gridSize);
      const y = Math.floor(this.motes[i * 4 + 1] / gridSize);
      const key = `${x},${y}`;
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(i);
    }

    // Check for collisions
    for (let [key, motesInCell] of grid.entries()) {
      const [x, y] = key.split(",").map(Number);
      const neighbors = [
        `${x},${y}`,
        `${x + 1},${y}`,
        `${x - 1},${y}`,
        `${x},${y + 1}`,
        `${x},${y - 1}`,
        `${x + 1},${y + 1}`,
        `${x - 1},${y - 1}`,
        `${x + 1},${y - 1}`,
        `${x - 1},${y + 1}`,
      ];

      for (let neighborKey of neighbors) {
        const neighborMotes = grid.get(neighborKey);
        if (neighborMotes) {
          for (let i of motesInCell) {
            for (let j of neighborMotes) {
              if (i < j) {
                const dx = this.motes[j * 4] - this.motes[i * 4];
                const dy = this.motes[j * 4 + 1] - this.motes[i * 4 + 1];
                const dsq = dx * dx + dy * dy;

                if (dsq < radiusSq) {
                  const d = Math.sqrt(dsq);
                  this.collide(i, j, d, dx, dy);
                }
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
