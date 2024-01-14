export class Spec {
  numMotes = 4000;
  motesPerStep = 40;

  moteRadius = 8;
  moteInfluenceRadius = 8;
  moteRenderScaling = 0.3;
  sectorSize = 40;

  // Flow field settings
  numDisturbances = 30;
  thetaVariance = 3.14;
  defaultTheta = 0;
  disturbanceRadiusMean = 100;
  disturbanceRadiusVariance = 200;
  flowCoefficient = 1;
  cxFlowCoefficient = 1;
}
