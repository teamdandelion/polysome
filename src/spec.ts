export class Spec {
  numMotes = 5000;
  // Dimensions overwritten at p5 setup time,
  // one will get reduced to match window ratio
  xDim = 1000;
  yDim = 1000;
  moteRadius = 8;
  moteInfluenceRadius = 8;
  moteRenderScaling = 0.3;
  sectorSize = 100;

  // Flow field settings
  numDisturbances = 30;
  thetaVariance = 3.14;
  defaultTheta = 0;
  disturbanceRadiusMean = 100;
  disturbanceRadiusVariance = 200;
}
