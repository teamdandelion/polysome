export class Spec {
  numMotes = 3200;
  motesPerStep = 300;

  moteRadius = 33;
  // Range over which mote influence decays
  moteCollisionDecay = 9;
  moteRenderScale = 0.12;
  moteForce = 0.1;

  moteHueBaseline = 20;
  moteHueFactor = 4.5;
  moteBrightFactor = 1;
  moteMaxHue = 320;

  moteEdgeDeflectionDistance = 0;
  moteEdgeDeflectionForce = 0.8;

  useForceField = false;
  forceFieldResolution = 4;

  // Flow field settings
  numDisturbances = 30;
  thetaVariance = 3.14;
  defaultTheta = 0;
  disturbanceRadiusMean = 100;
  disturbanceRadiusVariance = 200;
  flowCoefficient = 0.5;
  cxFlowCoefficient = 1.001;

  // Debug rendering settings
  // Global toggle for debug info
  debugMode = false;
  // Tuning which debug info is present
  debugForceField = false;
  debugRenderFlowfield = false;
  debugSectorGrid = false;
  debugSectorCounts = true;
  debugPane = true;
}
