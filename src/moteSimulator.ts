import p5 from "p5";
import { RenderContext } from "./renderContext";
import { Rng } from "./safeRandom";
import { FlowField } from "./flowField";

class MoteSimulator {
  nMotes = 10000;
  motePositions: Array<p5.Vector> = [];

  constructor(spec: Spec, rng: Rng, flowField: FlowField) {}
}
