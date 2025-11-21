import React, { useRef, useEffect } from "react";

import randomSeed from "../randomSeed.js";
import { Instance } from "../instance.js";
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

    // Fixed area normalization: canvas always has 1M logical units²
    // regardless of aspect ratio, ensuring consistent mote density
    const NORMALIZED_AREA = 1000000;
    const aspectRatio = ww / wh;
    const yDim = Math.sqrt(NORMALIZED_AREA / aspectRatio);
    const xDim = yDim * aspectRatio;

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
