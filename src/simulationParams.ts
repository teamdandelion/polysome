export class SimulationParams {
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
   * Thickness of the boundary repulsion zone in pixels. Motes within this distance from
   * any edge experience an inward repulsive force. Larger values create a broader "soft wall"
   * effect. Recommended: 2-5x moteRadius.
   */
  boundaryZone = 200;

  /**
   * Scale factor for boundary repulsion force. Higher values create stronger wall effects.
   * Force magnitude is: boundaryForce * (1 - distance/boundaryZone), capped at boundaryForceMax.
   */
  boundaryForce = 1;

  /**
   * Maximum boundary repulsion force applied per frame. Prevents excessive force when motes
   * are very close to walls. Should be comparable to typical flow field magnitude (1-3x).
   */
  boundaryForceMax = 1.5;

  /**
   * Maximum distance from edge where new motes spawn, in pixels. Should be <= boundaryZone.
   * Smaller values create crisper edge injection; larger values create more diffuse entry.
   */
  boundarySpawnDepth = 50;
}
