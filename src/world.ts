import p5 from "p5";

import { RenderContext } from "./renderContext";
import { Rng } from "./safeRandom";
import { FlowField, IFlowField, renderFF } from "./flowField";
import { Mote } from "./mote";
import { IEmitter, PositionalEmitter, RandomEmitter } from "./emitter";
import { Spec } from "./spec";
import { SectorTracker, type Collision } from "./sectors";

export class World {
  motes: Mote[];
  spec: Spec;
  rng: Rng;
  flowField: IFlowField;
  bounds: p5.Vector;
  sectorTracker: SectorTracker;
  emitters: IEmitter[];
  lastNumCollisions = 0;
  stepCounter = 0;
  numAdded = 0;

  constructor(spec: Spec, rng: Rng, flowField: IFlowField, bounds: p5.Vector) {
    this.spec = spec;
    this.bounds = bounds;
    this.rng = rng;
    this.flowField = flowField;
    this.sectorTracker = new SectorTracker(spec.sectorSize, bounds);

    this.motes = [];
    this.emitters = [new RandomEmitter(bounds, rng, spec)];
  }

  randomPos(): p5.Vector {
    const spec = this.spec;
    return new p5.Vector(
      this.rng.uniform(0, this.bounds.x),
      this.rng.uniform(0, this.bounds.y)
    );
  }

  inBounds(pos: p5.Vector) {
    return (
      pos.x >= 0 &&
      pos.x <= this.bounds.x &&
      pos.y >= 0 &&
      pos.y <= this.bounds.y
    );
  }

  // Adds a mote to the world
  addMote() {
    const emitter = this.rng.choice(this.emitters);
    const pos = emitter.emit();
    const mote = new Mote(pos);
    this.motes.push(mote);
  }

  // Steps through one time unit in the simulation
  step() {
    this.stepCounter++;
    this.numAdded = 0;
    while (
      this.motes.length < this.spec.numMotes &&
      this.numAdded < this.spec.motesPerStep
    ) {
      this.addMote();
      this.numAdded++;
    }

    this.motes.forEach((mote) => mote.resetCollisions());
    this.sectorTracker.updatePositions(this.motes);

    this.processCollisions();
    this.moveMotes();

    this.motes = this.motes.filter((mote) => this.inBounds(mote.pos));
  }

  processCollision({ a, b, d, v }: Collision) {
    const boundaryDistance = d - 2 * this.spec.moteRadius;
    let forceFactor;
    if (boundaryDistance < 0) {
      forceFactor = 0.2;
    } else {
      forceFactor =
        (0.2 * (this.spec.moteInfluenceRadius - boundaryDistance)) /
        this.spec.moteInfluenceRadius;
    }
    v.setMag(forceFactor);
    a.vCollide.sub(v);
    b.vCollide.add(v);
    a.nCollisions++;
    b.nCollisions++;
  }

  processCollisions() {
    const collisionRadius =
      this.spec.moteRadius * 2 + this.spec.moteInfluenceRadius;
    const collisions = this.sectorTracker.collisions(collisionRadius);

    this.lastNumCollisions = collisions.length;
    for (const c of collisions) {
      this.processCollision(c);
    }
  }

  moveMotes() {
    this.motes.forEach((mote) => {
      const vel = this.flowField.flow(mote.pos).mult(this.spec.flowCoefficient);
      mote.pos.add(
        vel.mult(Math.pow(this.spec.cxFlowCoefficient, mote.nCollisions))
      );
      mote.pos.add(mote.vCollide);
    });
  }

  render(rc: RenderContext) {
    rc.background(240, 100, 10);

    rc.strokeWeight(2);
    rc.noFill();

    this.motes.forEach((mote) => mote.render(rc, this.spec.moteRenderRadius));

    if (this.spec.debugMode) {
      if (this.spec.debugSectorGrid) {
        this.sectorTracker.render(rc, this.spec.debugSectorCounts);
      }
      if (this.spec.debugRenderFlowfield) {
        renderFF(this.flowField, this.bounds, rc);
      }

      if (this.spec.debugPane) {
        const p5 = rc.p5;
        p5.fill(240, 100, 10, 60);
        let x = p5.windowWidth - 220;
        let y = p5.windowHeight - 120;
        p5.rect(x, y, 180, 110);
        p5.fill(60, 20, 100);
        p5.textSize(14);
        function textLine(line: string) {
          p5.text(line, x + 10, y + 20);
          y += 20;
        }
        textLine(`Polysome             ${p5.frameRate().toFixed(0)} fps`);
        textLine(`step: ${this.stepCounter.toLocaleString()}`);
        textLine(`nMotes: ${this.motes.length.toLocaleString()}`);
        textLine(`nCollisions: ${this.lastNumCollisions.toLocaleString()}`);
        textLine(
          `collisions/mote: ${(
            this.lastNumCollisions / this.motes.length
          ).toFixed(2)}`
        );
      }
    }
  }
}
