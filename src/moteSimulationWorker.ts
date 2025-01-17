/// <reference lib="webworker" />

import { MoteSimulator } from "./moteSimulator.js";

let simulator: MoteSimulator;

self.onmessage = function (e) {
  const { type, data } = e.data;

  if (type === "init") {
    const { spec, seed, xDim, yDim } = data;
    simulator = new MoteSimulator(spec, seed, xDim, yDim);
  } else if (type === "step") {
    const step = simulator.step();
    const motesBuffer = simulator.motes.slice().buffer;
    const clusters = simulator.clusters.map((cluster) => cluster.toJSON());
    self.postMessage(
      {
        type: "update",
        motes: motesBuffer,
        stepCounter: step,
        clusters,
      },
      [motesBuffer]
    );
  }
};
