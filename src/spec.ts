export class Spec {
  numMotes = 4000;
  xMin = 0;
  xMax = 1000;
  yMin = 0;
  yMax = 1000;
  moteRadius = 8;
  moteInfluenceRadius = 8;
  sectorSize = 100;

  // Flow field settings
  numDisturbances = 30;
  thetaVariance = 3.14;
  defaultTheta = 0;
  disturbanceRadiusMean = 100;
  disturbanceRadiusVariance = 200;
}
