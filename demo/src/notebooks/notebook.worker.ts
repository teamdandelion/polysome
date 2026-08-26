/// <reference lib="webworker" />

import { Simulation } from "../../../src/simulation.ts";
import { findNotebook } from "./helloWorld.ts";

type IncomingMessage =
  { type: "initialize"; notebookId: string } | { type: "tick" };

let simulation: Simulation | undefined;

function postFrame() {
  if (!simulation) return;
  const view = simulation.view();
  const moteX = view.moteX.slice();
  const moteY = view.moteY.slice();
  const motePressure = view.motePressure.slice();
  self.postMessage(
    {
      type: "frame",
      step: view.step,
      width: view.width,
      height: view.height,
      moteRadius: view.moteRadius,
      moteX,
      moteY,
      motePressure,
    },
    [moteX.buffer, moteY.buffer, motePressure.buffer],
  );
}

function initialize(notebookId: string) {
  const notebook = findNotebook(notebookId);
  simulation = new Simulation(notebook.seed, notebook.width, notebook.height, {
    simulation: notebook.simulation,
  });
  postFrame();
  self.postMessage({ type: "ready" });
}

self.addEventListener("message", (event: MessageEvent<IncomingMessage>) => {
  try {
    const message = event.data;
    if (message.type === "initialize") {
      initialize(message.notebookId);
      return;
    }

    if (message.type === "tick" && simulation) {
      simulation.step();
      postFrame();
    }
  } catch (error: unknown) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
