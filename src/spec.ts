import { type ColorPoint } from "./colorInterpolationSystem.ts";

export class Spec {
  /**
   * Total number of motes in the simulation. Initialized randomly across the canvas and
   * reset to random positions when they drift out of bounds.
   */
  numMotes = 4200;

  /**
   * Detection radius for mote pressure in pixels. Motes within this distance trigger
   * repulsive forces and increment collision counters. Used for spatial hashing grid size
   * (gridSize = moteRadius * 2).
   */
  moteRadius = 42;

  /**
   * Visual rendering radius of each mote in pixels (typically much smaller than collision
   * radius). Rendered as ellipses with randomized specs (size, thickness, opacity, offset).
   */
  moteRenderRadius = 42 * 0.07;

  /**
   * Distance in pixels over which mote-to-mote repulsive force gradually decays to zero.
   * When distance between motes >= (moteRadius - moteCollisionDecay), force scales linearly
   * from full strength to zero. Creates softer collision boundaries.
   */
  moteCollisionDecay = 9;

  /**
   * Base magnitude of repulsive force applied when motes collide. The actual force applied
   * is normalized by distance and may be reduced by moteCollisionDecay. This creates the
   * "pressure" that pushes motes apart.
   */
  moteForce = 0.1;

  /**
   * Color gradient mapping collision counts to HSB colors. Motes interpolate through these
   * colors based on their current collision count. Low collision counts appear warmer
   * (orange/green), higher counts progress through cooler tones (teal/purple/magenta),
   * eventually reaching near-white at very high collision counts.
   */
  colorInterpolationPoints: Array<ColorPoint> = [
    { pressure: 0, color: { h: 30, s: 100, b: 100 } }, // Orange
    { pressure: 20, color: { h: 120, s: 100, b: 100 } }, // Green
    { pressure: 35, color: { h: 180, s: 100, b: 100 } }, // Teal
    { pressure: 56, color: { h: 200, s: 100, b: 100 } },

    { pressure: 62, color: { h: 240, s: 100, b: 100 } }, // Indigo
    { pressure: 80, color: { h: 270, s: 100, b: 100 } }, // Purple
    { pressure: 120, color: { h: 320, s: 100, b: 100 } }, // Magenta
    { pressure: 160, color: { h: 320, s: 40, b: 100 } }, // White-ish
  ];

  /**
   * Grid spacing in pixels for the flow field. The canvas is divided into a grid where
   * each point stores a flow angle (theta). Smaller values create more detailed flow
   * patterns but increase computation and memory.
   */
  flowFieldSpacing = 6;

  /**
   * Number of flow field disturbances (circular regions that modify flow direction).
   * Each disturbance has a position, velocity, rotation angle, and radius of influence.
   * They move around the canvas, bouncing off boundaries, creating dynamic flow patterns.
   */
  numDisturbances = 21;

  /**
   * Standard deviation for Gaussian sampling of each disturbance's angular offset (theta)
   * in radians. Higher values create more dramatic rotation within disturbance zones.
   * At ~3.14 (π), disturbances can create nearly full rotations.
   */
  thetaVariance = 3.14;

  /**
   * Default flow angle in radians for grid points outside disturbance influence.
   * Randomly initialized once per FlowField instance. Provides the base directional
   * "current" when no disturbances are nearby.
   */
  defaultTheta = 0;

  /**
   * Mean radius in pixels for flow field disturbances (center of Gaussian distribution).
   * Larger values create broader regions of flow rotation. Combined with variance, creates
   * variety in disturbance sizes.
   */
  disturbanceRadiusMean = 100;

  /**
   * Standard deviation for Gaussian sampling of disturbance radii in pixels. High variance
   * creates dramatic size differences between disturbances. Values can range from very small
   * to very large circular influence regions.
   */
  disturbanceRadiusVariance = 200;

  /**
   * Minimum velocity for moving disturbances in pixels per simulation step. Disturbances
   * drift across the canvas between this speed and disturbanceSpeedMax, bouncing off edges.
   */
  disturbanceSpeedMin = 0;

  /**
   * Maximum velocity for moving disturbances in pixels per simulation step. Higher values
   * create faster-moving flow patterns that dynamically reshape the directional field.
   */
  disturbanceSpeedMax = 0.5;

  /**
   * Base multiplier applied to flow field vectors when moving motes. Determines how strongly
   * the flow field influences mote movement relative to collision forces. At 0.5, flow has
   * moderate influence.
   */
  flowCoefficient = 0.5;

  /**
   * Per-collision exponential multiplier for flow influence. Flow strength is multiplied by
   * (cxFlowCoefficient ^ collisionCount). Values >1.0 mean motes with more pressure are
   * pushed harder by the flow field. At 1.001, effect is subtle but compounds significantly
   * at high collision counts.
   */
  cxFlowCoefficient = 1.001;

  /**
   * Enables debug overlay showing FPS, step counter, elapsed time, and mote count in the
   * top-right corner of the canvas. Useful for performance monitoring and troubleshooting.
   */
  debugMode = false;
}
