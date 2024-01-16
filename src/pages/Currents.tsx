import React, { useRef, useEffect } from "react";
import p5 from "p5";

import randomSeed from "../randomSeed";
import { sketchify } from "../instance";
import { Currents } from "../currents";

type CurrentsPageProps = {
  debug: boolean;
  seed?: string;
};

const CurrentsPage: React.FC<CurrentsPageProps> = ({ debug, seed }) => {
  const sketchRef = useRef<HTMLDivElement | null>(null);
  let sketchInstance: p5 | null = null;

  useEffect(() => {
    if (!sketchRef.current) {
      return;
    }
    seed = seed ?? randomSeed();
    console.log("Currents v2");
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
    const currentsInstance = new Currents(seed, xDim, yDim, debug);
    const sketch = sketchify(currentsInstance);
    new p5(sketch, sketchRef.current);

    return () => {
      if (sketchInstance) {
        sketchInstance.remove();
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount and clean up on unmount

  return <div ref={sketchRef} />;
};

export default CurrentsPage;
