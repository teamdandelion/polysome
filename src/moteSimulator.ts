import { DynamicFlowField } from "./flowField.js";
import { Rng, makeSeededRng } from "./safeRandom.js";
import { Spec } from "./spec.js";
import { Vector } from "./vector.js";

class Cluster {
  public position: Vector;
  public motes: Set<number>;

  constructor(initialMote: number, initialPosition: Vector) {
    this.position = initialPosition;
    this.motes = new Set([initialMote]);
  }

  update(motes: Float32Array) {
    let sum = new Vector(0, 0);
    for (const moteIndex of this.motes) {
      sum.add(new Vector(motes[moteIndex * 4], motes[moteIndex * 4 + 1]));
    }
    this.position = sum.mult(1 / this.motes.size);
  }

  toJSON() {
    return {
      position: this.position.toJSON(),
      motes: Array.from(this.motes),
    };
  }

  static fromJSON(json: any) {
    const cluster = new Cluster(-1, Vector.fromJSON(json.position));
    cluster.motes = new Set(json.motes);
    return cluster;
  }
}

class MoteSimulator {
  private rng: Rng;
  private xMax: number;
  private yMax: number;

  private nMotes: number;
  public motes: Float32Array;
  public clusters: Cluster[] = [];
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
    this.updateClusters(); // Update mote clusters
    this.applyClusterDynamics(); // Apply cluster dynamics
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
    let motesInClusters = new Set<number>(
      this.clusters.flatMap((cluster) => Array.from(cluster.motes))
    );

    // Create a map for quick cluster lookup
    const clusterMap = new Map<number, Cluster>();
    this.clusters.forEach((cluster) =>
      cluster.motes.forEach((mote) => clusterMap.set(mote, cluster))
    );
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
            let potentialCluster =
              clusterMap.get(i) ??
              new Cluster(
                i,
                new Vector(this.motes[i * 4], this.motes[i * 4 + 1])
              );
            let isNewCluster = !clusterMap.has(i);

            for (let j of neighborMotes) {
              if (i < j) {
                const jx = this.motes[j * 4];
                const jy = this.motes[j * 4 + 1];
                const dx = this.motes[j * 4] - this.motes[i * 4];
                const dy = this.motes[j * 4 + 1] - this.motes[i * 4 + 1];
                const dsq = dx * dx + dy * dy;

                const cdx = potentialCluster.position.x - jx;
                const cdy = potentialCluster.position.y - jy;
                const cdSq = cdx * cdx + cdy * cdy;

                if (dsq < radiusSq) {
                  const v = new Vector(dx, dy);
                  const d = Math.sqrt(dsq);
                  this.collide(i, j, d, v);
                }
                if (cdSq < this.spec.clusterRadius * this.spec.clusterRadius) {
                  potentialCluster.motes.add(j);
                  if (!isNewCluster) {
                    clusterMap.set(j, potentialCluster);
                  }
                }
              }
            }
            if (
              isNewCluster &&
              potentialCluster.motes.size > this.spec.clusterSize
            ) {
              this.clusters.push(potentialCluster);
              for (let mote of potentialCluster.motes) {
                clusterMap.set(mote, potentialCluster);
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

  updateClusters(): void {
    const clustersToRemove = new Set<number>();

    // Update existing clusters
    for (let i = this.clusters.length - 1; i >= 0; i--) {
      const cluster = this.clusters[i];
      cluster.update(this.motes);

      // Remove motes that are too far from the new cluster center
      for (const moteIndex of cluster.motes) {
        const motePos = new Vector(
          this.motes[moteIndex * 4],
          this.motes[moteIndex * 4 + 1]
        );
        if (Vector.dist(cluster.position, motePos) > this.spec.clusterRadius) {
          cluster.motes.delete(moteIndex);
        }
      }

      // Mark clusters that are too small for removal
      if (cluster.motes.size < this.spec.clusterCollapseSize) {
        clustersToRemove.add(i);
      }
    }

    // Merge clusters
    for (let i = this.clusters.length - 1; i >= 0; i--) {
      if (clustersToRemove.has(i)) continue;
      const cluster = this.clusters[i];
      for (let j = i - 1; j >= 0; j--) {
        if (clustersToRemove.has(j)) continue;
        const otherCluster = this.clusters[j];
        if (
          Vector.dist(cluster.position, otherCluster.position) <
          this.spec.clusterRadius
        ) {
          cluster.motes = new Set([...cluster.motes, ...otherCluster.motes]);
          cluster.update(this.motes); // Update position after merging
          clustersToRemove.add(j);
        }
      }
    }

    // Remove marked clusters
    for (let i = this.clusters.length - 1; i >= 0; i--) {
      if (clustersToRemove.has(i)) {
        this.clusters.splice(i, 1);
      }
    }
  }

  applyClusterDynamics(): void {
    for (const cluster of this.clusters) {
      for (const moteIndex of cluster.motes) {
        const motePos = new Vector(
          this.motes[moteIndex * 4],
          this.motes[moteIndex * 4 + 1]
        );
        const distanceToCenter = Vector.dist(motePos, cluster.position);

        // Apply cohesion force
        const cohesionForce = cluster.position.copy().sub(motePos);
        const cohesionStrength = Math.min(
          distanceToCenter * this.spec.clusterCohesionFactor,
          this.spec.maxCohesionForce
        );
        cohesionForce.setMag(cohesionStrength);

        // Apply separation force
        let separationForce = new Vector(0, 0);
        if (distanceToCenter < this.spec.clusterSeparationRadius) {
          separationForce = motePos.copy().sub(cluster.position);
          const separationStrength =
            this.spec.clusterSeparationFactor *
            (1 - distanceToCenter / this.spec.clusterSeparationRadius);
          separationForce.setMag(separationStrength);
        }

        // Apply alignment force (assuming we have a method to calculate cluster velocity)
        const clusterVelocity = this.calculateClusterVelocity(cluster);
        const alignmentForce = clusterVelocity.sub(
          new Vector(
            this.velocities[moteIndex * 2],
            this.velocities[moteIndex * 2 + 1]
          )
        );
        alignmentForce.mult(this.spec.clusterAlignmentFactor);

        // Combine forces
        const totalForce = cohesionForce
          .add(separationForce)
          .add(alignmentForce);

        // Apply the combined force
        this.velocities[moteIndex * 2] += totalForce.x;
        this.velocities[moteIndex * 2 + 1] += totalForce.y;
      }
    }
  }

  calculateClusterVelocity(cluster: Cluster): Vector {
    let avgVelocity = new Vector(0, 0);
    for (const moteIndex of cluster.motes) {
      avgVelocity.add(
        new Vector(
          this.velocities[moteIndex * 2],
          this.velocities[moteIndex * 2 + 1]
        )
      );
    }
    return avgVelocity.mult(1 / cluster.motes.size);
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

export { MoteSimulator, Cluster };
