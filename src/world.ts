import p5 from "p5";

import { RenderContext } from "./renderContext";
import { Rng } from "./safeRandom";
import { FlowField, IFlowField, renderFF } from "./flowField";
import { Mote } from "./mote";
import { IEmitter, PositionalEmitter, RandomEmitter } from "./emitter";
import { Spec } from "./spec";
import { SectorTracker, type Collision } from "./sectors";
import { ForceField } from "./forceField";

export class World {
  motes: Mote[];
  spec: Spec;
  rng: Rng;
  flowField: IFlowField;
  bounds: p5.Vector;
  sectorTracker: SectorTracker;
  emitters: IEmitter[];
  forceField: ForceField;
  lastNumCollisions = 0;
  stepCounter = 0;
  numAdded = 0;
  start: number;
  debugMote: Mote | null;

  constructor(spec: Spec, rng: Rng, flowField: IFlowField, bounds: p5.Vector) {
    this.spec = spec;
    this.bounds = bounds;
    this.rng = rng;
    this.flowField = flowField;
    this.forceField = new ForceField(spec, bounds);
    this.sectorTracker = new SectorTracker(spec.moteRadius, bounds);

    this.motes = [];
    this.debugMote = null;
    this.emitters = [new RandomEmitter(bounds, rng, spec)];
    this.start = Date.now();
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
    const mote = new Mote(pos, this.rng, this.spec);
    this.motes.push(mote);
    if (
      this.spec.debugMode &&
      this.spec.useDebugMote &&
      this.debugMote == null
    ) {
      this.debugMote = mote;
      mote.isDebugMote = true;
    }
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

    if (this.spec.useForceField) {
      this.processCollisionsForceField();
    } else {
      this.processCollisions();
    }
    this.moveMotes();

    if (this.debugMote != null) {
      if (!this.inBounds(this.debugMote.pos)) {
        // Stop tracking this debug mote, it's about to be filtered out
        this.debugMote = null;
      }
    }
    this.motes = this.motes.filter((mote) => this.inBounds(mote.pos));
  }

  collide({ a, b, d, v }: Collision) {
    let forceFactor = this.spec.moteForce;
    if (d >= this.spec.moteRadius - this.spec.moteCollisionDecay) {
      forceFactor =
        (this.spec.moteForce * (this.spec.moteRadius - d)) /
        this.spec.moteCollisionDecay;
    }
    v.setMag(forceFactor);
    a.vCollide.sub(v);
    b.vCollide.add(v);
    a.nCollisions++;
    b.nCollisions++;
  }

  processCollisions() {
    this.motes.forEach((mote) => mote.resetCollisions());
    this.sectorTracker.updatePositions(this.motes);

    const collisions = this.sectorTracker.collisions(this.spec.moteRadius);

    this.lastNumCollisions = collisions.length;
    for (const c of collisions) {
      this.collide(c);
    }
  }

  processCollisionsForceField() {
    this.forceField.setMotes(this.motes);

    this.motes.forEach((mote) => {
      const { f, nCollisions } = this.forceField.approximateForceAt(mote.pos);
      mote.vCollide = f;
      mote.nCollisions = nCollisions;
      mote.age++;
    });
  }

  moveMotes() {
    this.motes.forEach((mote) => {
      const vel = this.flowField.flow(mote.pos).mult(this.spec.flowCoefficient);
      const bf = this.spec.moteEdgeDeflectionForce;
      const br = this.spec.moteEdgeDeflectionDistance;
      if (br > 0) {
        if (mote.pos.x < br) {
          vel.x += (bf * (br - mote.pos.x)) / br;
        }
        if (mote.pos.x > this.bounds.x - br) {
          vel.x -= (bf * (br - this.bounds.x + mote.pos.x)) / br;
        }
        if (mote.pos.y < br) {
          vel.y += (bf * (br - mote.pos.y)) / br;
        }
        if (mote.pos.y > this.bounds.y - br) {
          vel.y -= (bf * (br - this.bounds.y + mote.pos.y)) / br;
        }
      }

      mote.pos.add(
        vel.mult(Math.pow(this.spec.cxFlowCoefficient, mote.nCollisions))
      );
      mote.pos.add(mote.vCollide);
    });
  }

  render(rc: RenderContext) {
    rc.background(240, 100, 10);

    rc.strokeWeight(1.5);
    rc.noFill();

    this.motes.forEach((mote) => mote.render(rc));

    if (this.spec.debugMode) {
      if (this.spec.debugSectorGrid) {
        this.sectorTracker.render(rc, this.spec.debugSectorCounts);
      }
      if (this.spec.debugRenderFlowfield) {
        renderFF(this.flowField, this.bounds, rc);
      }
      if (this.spec.debugForceField) {
        this.forceField.render(rc);
      }

      if (this.spec.debugPane) {
        const p5 = rc.p5;
        p5.fill(240, 100, 10, 60);
        let x = p5.windowWidth - 180;
        let y = 10;
        p5.rect(x, y, 180, 110);
        p5.fill(60, 20, 100);
        p5.textSize(14);
        function textLine(line: string) {
          p5.text(line, x + 10, y + 20);
          y += 20;
        }
        const elapsed = (Date.now() - this.start) / 1000;
        textLine(`Polysome             ${p5.frameRate().toFixed(0)} fps`);
        textLine(
          `step: ${this.stepCounter.toLocaleString()}               ${elapsed.toFixed(
            0
          )}s`
        );
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
