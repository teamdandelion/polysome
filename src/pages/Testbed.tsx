import React, { useRef, useEffect } from "react";
import p5 from "p5";

import randomSeed from "../randomSeed";
import { sketchify } from "../instance";
import { Testbed } from "../testbed";

const TestbedPage = () => {
  const sketchRef = useRef<HTMLDivElement | null>(null);
  let sketchInstance: p5 | null = null;

  useEffect(() => {
    if (!sketchRef.current) {
      return;
    }
    const seed = randomSeed();
    console.log("Testbed v1");
    console.log(seed);
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    let xDim = 1000;
    let yDim = 1000;
    if (ww > wh) {
      yDim = (wh / ww) * xDim;
    } else {
      xDim = (ww / wh) * yDim;
    }
    const instance = new Testbed(seed, xDim, yDim);
    const sketch = sketchify(instance);
    new p5(sketch, sketchRef.current);

    return () => {
      if (sketchInstance) {
        sketchInstance.remove();
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount and clean up on unmount

  return <div ref={sketchRef} />;
};

export default TestbedPage;
