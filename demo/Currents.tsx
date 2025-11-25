import React, { useRef, useEffect } from "react";

import { randomSeed, Instance } from "polysome";
import "./Currents.css";

type CurrentsPageProps = {
  debug: boolean;
  seed?: string;
};

const CurrentsPage: React.FC<CurrentsPageProps> = ({ debug, seed }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    seed = seed ?? randomSeed();
    console.log("Currents v4");
    console.log(debug, seed);

    const ww = window.innerWidth;
    const wh = window.innerHeight;
    let xDim = 1000;
    let yDim = 1000;
    if (ww > wh) {
      yDim = (wh / ww) * xDim;
    } else {
      xDim = (ww / wh) * yDim;
    }

    const instance = new Instance(seed, xDim, yDim, debug);
    instance.setup(canvas);
    instance.start();

    return () => {
      instance.stop();
    };
  }, []); // Empty dependency array means this effect runs once on mount and clean up on unmount

  return (
    <div>
      <div className="relative-div">
        <div className="placard">
          <p className="placard-title">Polysome</p>
          <p className="placard-bottom">
            <i className="author-name">Dandelion Mané</i>
          </p>
        </div>
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100vw",
            height: "100vh",
          }}
        />
      </div>
    </div>
  );
};

export default CurrentsPage;
