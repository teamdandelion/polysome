import p5 from "p5";

import { World } from "./world";
import { Mote } from "./mote";
import { FlowField, flowSpec } from "./flowField";
import { Spec } from "./spec";
import randomSeed from "./randomSeed";
import { makeSeededRng, Rng } from "./safeRandom";
import { RenderContext } from "./renderContext";

export interface PolysomeInstance {
  setup(p5: p5): void;
  step(): void;
  draw(): void;
}

export function sketchify(instance: PolysomeInstance) {
  return (p5: p5) => sketch(instance, p5);
}

function sketch(instance: PolysomeInstance, p5: p5) {
  p5.setup = () => {
    instance.setup(p5);
  };

  p5.draw = () => {
    instance.step();
    instance.draw();
  };
}
