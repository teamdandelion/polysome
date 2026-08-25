/// <reference lib="webworker" />

import { measureMorphology } from "../../../src/morphology.ts";
import {
  evaluateScienceExhibit,
  findScienceExhibit,
} from "../../../src/scienceExhibits.ts";
import { Simulation } from "../../../src/simulation.ts";

type IncomingMessage =
  | { type: "initialize"; exhibitId: string }
  | { type: "play" }
  | { type: "pause" }
  | { type: "restart" };

let exhibit: ReturnType<typeof findScienceExhibit> | undefined;
let simulation: Simulation | undefined;
let generation = 0;
let wantsToPlay = false;
let ready = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let resumeWaiters: Array<() => void> = [];

const waitForTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function wakeResumeWaiters() {
  for (const resolve of resumeWaiters) resolve();
  resumeWaiters = [];
}

async function waitUntilPlaying(thisGeneration: number): Promise<boolean> {
  while (!wantsToPlay) {
    await new Promise<void>((resolve) => resumeWaiters.push(resolve));
    if (thisGeneration !== generation) return false;
  }
  return true;
}

function stopTimer() {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
}

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

function scheduleFrame() {
  stopTimer();
  if (!ready || !wantsToPlay || !simulation || !exhibit) return;
  const activeSimulation = simulation;
  const activeExhibit = exhibit;
  timer = setTimeout(() => {
    timer = undefined;
    activeSimulation.step();
    postFrame();
    if (
      activeExhibit.liveStopStep !== undefined &&
      activeSimulation.view().step >= activeExhibit.liveStopStep
    ) {
      wantsToPlay = false;
      self.postMessage({
        type: "complete",
        step: activeSimulation.view().step,
        reason: "registered-limit",
      });
      return;
    }
    scheduleFrame();
  }, 1000 / exhibit.liveFps);
}

async function initialize(exhibitId: string) {
  const thisGeneration = ++generation;
  wakeResumeWaiters();
  stopTimer();
  ready = false;
  exhibit = findScienceExhibit(exhibitId);
  simulation = new Simulation(exhibit.seed, exhibit.width, exhibit.height, {
    parameters: exhibit.parameters,
  });

  self.postMessage({
    type: "status",
    status: "warming",
    step: 0,
    targetStep: exhibit.measurementStep,
  });

  const chunkSize = 10;
  while (simulation.view().step < exhibit.measurementStep) {
    if (thisGeneration !== generation) return;
    if (!(await waitUntilPlaying(thisGeneration))) return;
    const remaining = exhibit.measurementStep - simulation.view().step;
    simulation.advance(Math.min(chunkSize, remaining));
    self.postMessage({
      type: "status",
      status: "warming",
      step: simulation.view().step,
      targetStep: exhibit.measurementStep,
    });
    await waitForTask();
  }

  if (thisGeneration !== generation) return;
  const view = simulation.view();
  const morphology = measureMorphology(view);
  const expectations = evaluateScienceExhibit(exhibit, morphology, view);
  ready = true;
  self.postMessage({
    type: "measurement",
    step: view.step,
    expectations,
    passed: expectations.every((expectation) => expectation.passed),
  });
  postFrame();
  scheduleFrame();
}

self.addEventListener("message", (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;
  if (message.type === "initialize") {
    initialize(message.exhibitId).catch((error: unknown) => {
      self.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    });
    return;
  }

  if (message.type === "play") {
    wantsToPlay = true;
    wakeResumeWaiters();
    scheduleFrame();
    return;
  }

  if (message.type === "pause") {
    wantsToPlay = false;
    stopTimer();
    return;
  }

  if (message.type === "restart" && exhibit) {
    initialize(exhibit.id).catch((error: unknown) => {
      self.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }
});
