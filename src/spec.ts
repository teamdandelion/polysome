export class Spec {
  numMotes = 6000;
  motesPerStep = 40;

  moteRenderRadius = 2.4;
  // Radius at which motes influence each other
  moteCollisionRadius = 24;
  moteInfluenceRadius = 8;
  moteForceFactor = 0.2;
  sectorSize = 40;

  // Flow field settings
  numDisturbances = 30;
  thetaVariance = 3.14;
  defaultTheta = 0;
  disturbanceRadiusMean = 100;
  disturbanceRadiusVariance = 200;
  flowCoefficient = 1;
  cxFlowCoefficient = 1;

  // Debug rendering settings
  // Global toggle for debug info
  debugMode = false;
  // Tuning which debug info is present
  debugRenderFlowfield = true;
  debugSectorGrid = false;
  debugSectorCounts = true;
  debugPane = true;
}
