import p5 from "p5";
import { RenderContext } from "./renderContext";
import { IFlowField } from "./flowField";
import { Spec } from "./spec";
import { Rng } from "./safeRandom";

export interface IEmitter {
  step(): void;
  emit(): p5.Vector;
}

export class RandomEmitter {
  bounds: p5.Vector;
  rng: Rng;
  constructor(bounds: p5.Vector, rng: Rng, spec: Spec) {
    this.bounds = bounds;
    this.rng = rng;
  }

  emit() {
    return new p5.Vector(
      this.rng.uniform(0, this.bounds.x),
      this.rng.uniform(0, this.bounds.y)
    );
  }

  step() {
    return;
  }
}

export class PositionalEmitter {
  pos: p5.Vector;
  spec: Spec;
  ff: IFlowField;
  rng: Rng;

  constructor(spec: Spec, rng: Rng, ff: IFlowField, pos: p5.Vector) {
    this.pos = pos;
    this.rng = rng;
    this.ff = ff;
    this.spec = spec;
  }

  step() {
    const flow = this.ff.flow(this.pos);
    this.pos.sub(flow);
  }

  emit() {
    const x = this.rng.gauss(0, this.spec.moteRadius);
    const y = this.rng.gauss(0, this.spec.moteRadius);
    return new p5.Vector(this.pos.x + x, this.pos.y + y);
  }
}
