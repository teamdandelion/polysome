export class Spec {
  numMotes = 6000;
  motesPerStep = 40;

  moteRadius = 30;
  // Range over which mote influence decays
  moteCollisionDecay = 7;
  moteRenderScale = 0.12;
  moteForce = 0.2;

  moteHueFactor = 3;
  moteBrightFactor = 1;

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
