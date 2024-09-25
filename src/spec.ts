export class Spec {
  numMotes = 4200;
  motesPerStep = 30;

  moteRadius = 42;
  moteRenderRadius = 42 * 0.07;
  // Range over which mote influence decays
  moteCollisionDecay = 9;
  moteForce = 0.1;

  moteHueBaseline = 10;
  moteHueFactor = 4.5;
  moteBrightFactor = 1;
  moteMaxHue = 320;

  useForceField = false;
  forceFieldResolution = 4;

  clusterRadius = 16;
  clusterSize = 12;
  clusterRenderRadius = 9;

  metaclusterRadius = 16 * 4;
  metaclusterSize = 7;
  metaclusterRenderRadius = 11;

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
  debugSectorCounts = false;
  debugPane = true;
  useDebugMote = false;
}
