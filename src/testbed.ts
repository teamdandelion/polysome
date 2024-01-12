import p5 from "p5";

import { World } from "./world";
import { Mote } from "./mote";
import { TestFlowField } from "./flowField";
import { Spec } from "./spec";
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
  let spec: Spec;
  let world: World;

  const worldDim = 1000;

  p5.setup = () => {
    console.log("test");
    let seed = randomSeed();
    console.log(`seed: ${seed}`);
    const rng = makeSeededRng(seed);
    const spec = new Spec();
    spec.numMotes = 3000;
    spec.motesPerStep = 20;
    const zoomLevel = 2;

    const wh = p5.windowHeight;
    const ww = p5.windowWidth;
    if (ww > wh) {
      spec.yDim = spec.xDim * (wh / ww);
    } else {
      spec.xDim = spec.yDim * (ww / wh);
    }
    const ff = new TestFlowField(spec.xDim / 2, spec.yDim / 2);
    rc = new RenderContext(p5, spec, zoomLevel);
    world = new World(spec, rng, ff);
  };

  p5.draw = () => {
    world.render(rc);
    world.step();
  };
}

new p5(sketch);
