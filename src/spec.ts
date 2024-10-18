import { type ColorPoint } from "./colorInterpolationSystem.js";

export class Spec {
  numMotes = 4200;

  moteRadius = 42;
  moteRenderRadius = 42 * 0.07;
  // Range over which mote influence decays
  moteCollisionDecay = 9;
  moteForce = 0.1;

  colorInterpolationPoints: Array<ColorPoint> = [
    { collisions: 0, color: { h: 30, s: 100, b: 100 } }, // Orange
    { collisions: 20, color: { h: 120, s: 100, b: 100 } }, // Green
    { collisions: 35, color: { h: 180, s: 100, b: 100 } }, // Teal
    { collisions: 56, color: { h: 200, s: 100, b: 100 } },

    { collisions: 62, color: { h: 240, s: 100, b: 100 } }, // Indigo
    { collisions: 80, color: { h: 270, s: 100, b: 100 } }, // Purple
    { collisions: 120, color: { h: 320, s: 100, b: 100 } }, // Magenta
    { collisions: 160, color: { h: 320, s: 40, b: 100 } }, // White-ish
  ];

  drawClusters = false;
  clusterRadius = 14;
  clusterSize = 10;
  clusterCollapseSize = 7;
  clusterRenderRadius = 11;

  // Cluster dynamics parameters
  clusterCohesionFactor = 0.0;
  maxCohesionForce = 1.0;
  clusterSeparationFactor = 0.0;
  clusterSeparationRadius = 6;
  clusterAlignmentFactor = 0.0;
  velocityDamping = 0.98;

  // Flow field settings
  numDisturbances = 30;
  thetaVariance = 3.14;
  defaultTheta = 0;
  disturbanceRadiusMean = 100;
  disturbanceRadiusVariance = 200;
  flowCoefficient = 0.5;
  cxFlowCoefficient = 1.001;

  debugPane = false;
}
