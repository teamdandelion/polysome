export class Spec {
  numMotes = 6000;
  motesPerStep = 40;

  moteSize = 2.4;
  // Radius at which motes influence each other
  moteCollision = 12;
  moteInfluence = 3;
  moteForce = 0.2;

  forceFieldResolution = 24;

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
  debugForceField = true;
  debugRenderFlowfield = false;
  debugSectorGrid = false;
  debugSectorCounts = true;
  debugPane = true;
}
