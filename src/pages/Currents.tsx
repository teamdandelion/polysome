import React, { useRef, useEffect } from "react";
import p5 from "p5";

import { sketch } from "../polysome";

const Currents = () => {
  const sketchRef = useRef<HTMLDivElement | null>(null);
  let sketchInstance: p5 | null = null;

  useEffect(() => {
    if (!sketchRef.current) {
      return;
    }
    new p5(sketch, sketchRef.current);

    return () => {
      if (sketchInstance) {
        sketchInstance.remove();
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount and clean up on unmount

  return <div ref={sketchRef} />;
};

export default Currents;
