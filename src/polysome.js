import randomSeed from "./random-seed.js";
import { makeSeededRng } from "./safe-random.js";

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
} from "./safe-math.js";

function sketch(p5) {
  let R /*: Rng */;
  let c, ww, wh, wr;

  const dw = 1000;
  const dh = 1000;

  p5.setup = () => {
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
    seed = randomSeed();
    R = makeSeededRng(seed);
  };

  p5.windowResized = () => {
    const d = Math.min(p5.windowWidth, p5.windowHeight);
    p5.resizeCanvas(d, d);
  };

  function w(v = 1.0) {
    return dw * v;
  }

  function h(v = 1.0) {
    return dh * v;
  }

  function ellipse(x, y, w, h) {
    p5.ellipse(x * wr, y * wr, w * wr, h * wr);
  }

  function vrtx(x, y) {
    p5.vertex(x * wr, y * wr);
  }

  function sWeight(v) {
    p5.strokeWeight(v * wr);
  }

  p5.draw = () => {
    p5.background(240, 100, 10);
    p5.fill(30, 100, 100, 100);
    ellipse(500, 400, 50, 50);
  };
}

new p5(sketch);
