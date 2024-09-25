import React, { useRef, useEffect } from "react";
import p5 from "p5";

import randomSeed from "../randomSeed.js";
import { sketchify, Instance } from "../instance.js";
import "./Currents.css";

type CurrentsPageProps = {
  debug: boolean;
  seed?: string;
};

const CurrentsPage: React.FC<CurrentsPageProps> = ({ debug, seed }) => {
  const sketchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sketchRef.current) {
      return;
    }
    seed = seed ?? randomSeed();
    console.log("Currents v3");
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
    const instsance = new Instance(seed, xDim, yDim, debug);
    const sketch = sketchify(instsance);
    new p5(sketch, sketchRef.current);

    return () => {};
  }, []); // Empty dependency array means this effect runs once on mount and clean up on unmount

  return (
    <div>
      <div className="relative-div">
        <div className="placard">
          <p className="placard-title">
            Polysome: <i> Currents </i>
          </p>
          <p className="placard-bottom">
            <i className="author-name">by Indigo Mané</i>
          </p>
        </div>
        <div ref={sketchRef} />
      </div>
    </div>
  );
};

export default CurrentsPage;
