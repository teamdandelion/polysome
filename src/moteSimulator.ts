import { DynamicFlowField } from "./flowField.js";
import { Rng, makeSeededRng } from "./safeRandom.js";
import { Spec } from "./spec.js";
import { Vector } from "./vector.js";

class MoteSimulator {
  private rng: Rng;
  private xMax: number;
  private yMax: number;

  private nMotes: number;
  public motes: Float32Array;
  public clusters: Vector[] = [];
  private velocities: Float32Array;
  private flowField: DynamicFlowField;
  private spec: Spec;
  private start: number;
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
    this.start = Date.now();
  }

  step(): number {
    this.flowField.step(); // Update the flow field
    this.reset(); // Reset mote colllision velocities and collision counts
    this.processCollisions(); // Compute collision velocity and count for each mote
    this.moveMotes(); // Move motes based on collision velocities and flow field
    return this.stepCounter++;
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
    // Each cluster will just be characterized by its average x and y position
    this.clusters = [];
    let includedInCluster = new Set<number>();

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
            let potentialCluster: Set<number> | null = null;
            if (!includedInCluster.has(i)) {
              potentialCluster = new Set([i]);
            }
            for (let j of neighborMotes) {
              if (i < j) {
                const dx = this.motes[j * 4] - this.motes[i * 4];
                const dy = this.motes[j * 4 + 1] - this.motes[i * 4 + 1];
                const dsq = dx * dx + dy * dy;
                if (dsq < radiusSq) {
                  const v = new Vector(dx, dy);
                  const d = Math.sqrt(dsq);
                  this.collide(i, j, d, v);
                  if (
                    d < this.spec.clusterRadius &&
                    !includedInCluster.has(j) &&
                    potentialCluster
                  ) {
                    potentialCluster.add(j);
                  }
                }
              }
            }
            if (
              potentialCluster &&
              potentialCluster.size > this.spec.clusterSize
            ) {
              includedInCluster = new Set([
                ...Array.from(includedInCluster),
                ...Array.from(potentialCluster),
              ]);
              const avgPosition = Array.from(potentialCluster).reduce(
                (acc, mote) =>
                  acc.add(
                    new Vector(this.motes[mote * 4], this.motes[mote * 4 + 1])
                  ),
                new Vector(0, 0)
              );
              avgPosition.mult(1 / potentialCluster.size);
              this.clusters.push(avgPosition);
            }
          }
        }
      }
    }
  }

  moveMotes() {
    for (let i = 0; i < this.nMotes; i++) {
      // Compute the flow field vector for the mote
      const flowVector = this.flowField.flow(
        new Vector(this.motes[i * 4], this.motes[i * 4 + 1])
      );

      // Scale the magnitude of the flow field vector
      const nCollisions = this.motes[i * 4 + 2];
      const flowCoefficient = Math.pow(
        this.spec.cxFlowCoefficient,
        nCollisions
      );
      flowVector.mult(this.spec.flowCoefficient * flowCoefficient);

      // Update the mote position based on the flow field vector and the aggregate collision vector
      this.motes[i * 4] += flowVector.x + this.velocities[i * 2];
      this.motes[i * 4 + 1] += flowVector.y + this.velocities[i * 2 + 1];
    }
  }

  // Handle collisions
  private collide(a: number, b: number, d: number, v: Vector): void {
    let forceFactor = this.spec.moteForce;
    if (d >= this.spec.moteRadius - this.spec.moteCollisionDecay) {
      forceFactor =
        (this.spec.moteForce * (this.spec.moteRadius - d)) /
        this.spec.moteCollisionDecay;
    }
    v.setMag(forceFactor);
    this.velocities[a * 2] -= v.x;
    this.velocities[a * 2 + 1] -= v.y;
    this.velocities[b * 2] += v.x;
    this.velocities[b * 2 + 1] += v.y;

    // Increment collision counts
    this.motes[a * 4 + 2]++;
    this.motes[b * 4 + 2]++;
  }
}

export { MoteSimulator };
