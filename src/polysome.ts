import p5 from "p5";

import { World } from "./world";
import { Mote } from "./mote";
import { FlowField, randomFlowSpec } from "./flowField";
import randomSeed from "./randomSeed";
import { makeSeededRng } from "./safeRandom";
import { RenderContext } from "./renderContext";

import {
  pi,
  mod,
  rescale,
  clip,
  sin,
  cos,
  dist,
  distUpperBound,
  distLowerBound,
  angle,
} from "./safeMath";

function sketch(p5: p5) {
  let R /*: Rng */;
  let rc: RenderContext;
  let world: World;

  const worldDim = 1000;

  p5.setup = () => {
    const seed = randomSeed();
    const rng = makeSeededRng(seed);
    const ff = new FlowField(randomFlowSpec(rng));
    rc = new RenderContext(p5, worldDim);
    world = new World(rng, ff);

    p5.colorMode(p5.HSB, 360, 100, 100, 100);
  };

  p5.windowResized = () => {
    const d = Math.min(p5.windowWidth, p5.windowHeight);
    p5.resizeCanvas(d, d);
  };

  p5.mouseClicked = () => {
    const seed = randomSeed();
    const rng = makeSeededRng(seed);
    const ff = new FlowField(randomFlowSpec(rng));
    world = new World(rng, ff);
  };

  p5.draw = () => {
    world.render(rc);
    world.step();
  };
}

new p5(sketch);
