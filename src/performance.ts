export type SimulationPerformance = {
  simulateMs: number;
  flowFieldMs: number;
  resetMs: number;
  collisionMs: number;
  moveMotesMs: number;
  collisionCount: number;
};

export type PerformanceSample = SimulationPerformance & {
  step: number;
  timestamp: number;
  frameMs: number;
  frameIntervalMs: number;
  renderMs: number;
};
