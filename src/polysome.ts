import p5 from "p5";

import randomSeed from "./randomSeed.js";
import { makeSeededRng } from "./safeRandom.js";

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
    const seed = randomSeed();
    R = makeSeededRng(seed);
  };

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

  p5.draw = () => {
    p5.background(240, 100, 10);
    p5.fill(30, 100, 100, 100);
    ellipse(500, 400, 50, 50);
  };
}

new p5(sketch);
