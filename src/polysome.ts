import p5 from "p5";

import { World, Mote } from "./world";
import { FlowField, randomFlowSpec } from "./flowField";
import randomSeed from "./randomSeed";
import { makeSeededRng } from "./safeRandom";

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
  let c;
  let ww: number;
  let wh: number;
  let wr: number;
  let world: World;

  const dw = 1000;
  const dh = 1000;

  p5.setup = () => {
    const seed = randomSeed();
    const rng = makeSeededRng(seed);
    const ff = new FlowField(randomFlowSpec(rng));
    world = new World(rng, ff);

    let ww, wh;
    ww = p5.windowWidth;
    wh = p5.windowHeight;
    if (ww > wh) {
      ww = wh;
    } else {
      wh = ww;
    }
    wr = ww / dw; // ratio to window

    p5.pixelDensity(1);
    c = p5.createCanvas(ww, wh);

    p5.colorMode(p5.HSB, 360, 100, 100, 100);
  };

  function convertCoordinate(spatial: p5.Vector): p5.Vector {
    // Convert the vector from a simulation coordinate to a screen coordinate
    return spatial.copy().mult(wr);
  }

  p5.windowResized = () => {
    const d = Math.min(p5.windowWidth, p5.windowHeight);
    p5.resizeCanvas(d, d);
  };

  function w(v = 1.0) {
    return dw * v;
  }

  function h(v: number = 1.0) {
    return dh * v;
  }

  function ellipse(x: number, y: number, w: number, h: number) {
    p5.ellipse(x * wr, y * wr, w * wr, h * wr);
  }

  function vrtx(x: number, y: number) {
    p5.vertex(x * wr, y * wr);
  }

  function sWeight(v: number) {
    p5.strokeWeight(v * wr);
  }

  function drawMote(mote: Mote) {
    const c = convertCoordinate(mote.pos);
    p5.stroke(30, 100, 100, 100);
    p5.noFill();
    p5.circle(c.x, c.y, 10);
  }

  p5.draw = () => {
    world.step();
    p5.background(240, 100, 10);
    p5.fill(30, 100, 100, 100);
    for (let i = 0; i < world.motes.length; i++) {
      const mote = world.motes[i];
      drawMote(mote);
    }
  };
}

new p5(sketch);
