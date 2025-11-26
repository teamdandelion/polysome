import { type ColorPoint } from "./colorInterpolationSystem.ts";

export class RenderParams {
  /**
   * Scale factor for visual rendering of motes relative to their collision radius. At 0.07,
   * motes render much smaller than their collision detection radius, creating visual separation
   * even when motes are physically interacting. Rendered as ellipses with randomized specs.
   */
  moteRenderScale = 0.07;

  /**
   * Mean size multiplier for mote rendering. Each mote's size is sampled from a Gaussian
   * distribution centered at this value. At 1.0, motes render at moteRenderRadius size.
   */
  moteSizeFactorMean = 1;

  /**
   * Standard deviation for Gaussian sampling of mote size multipliers. Higher values create
   * more variation in mote sizes. Combined with moteSizeFactorMin to prevent too-small motes.
   */
  moteSizeFactorVariance = 0.3;

  /**
   * Minimum size multiplier for mote rendering. Prevents motes from becoming invisibly small
   * when sampled from the size distribution. At 0.3, smallest motes are 30% of base size.
   */
  moteSizeFactorMin = 0.3;

  /**
   * Mean stroke thickness for rendering mote circles. Each mote's thickness is sampled from
   * a Gaussian distribution centered at this value.
   */
  moteThicknessMean = 0.5;

  /**
   * Standard deviation for Gaussian sampling of mote stroke thickness. Creates variety in
   * line weights across different motes.
   */
  moteThicknessVariance = 0.2;

  /**
   * Standard deviation for Gaussian sampling of mote X-position offset in pixels (mean=0).
   * Adds random horizontal jitter to each mote's rendered position relative to its simulated
   * position, creating a more organic appearance.
   */
  moteOffsetVariance = 1;

  /**
   * Background color in HSB color space (hue: 0-360, saturation: 0-100, brightness: 0-100).
   */
  backgroundColor = { h: 240, s: 100, b: 10 };

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
   * Whether to show the flow field visualization
   */
  showFlowField = false;

  /**
   * Number of steps to trace forward and backward from each field point
   */
  flowFieldNumSteps = 50;

  /**
   * Size of each step when tracing the flow field streamlines
   */
  flowFieldStepSize = 2;

  /**
   * Sample rate for field points (1 = every point, 2 = every other point, etc.)
   */
  flowFieldSampleRate = 2;

  /**
   * Stroke weight for flow field lines
   */
  flowFieldStrokeWeight = 0.5;

  /**
   * Opacity of flow field lines (0-100)
   */
  flowFieldOpacity = 10;

  /**
   * Color of flow field lines in HSB
   */
  flowFieldColor = { h: 180, s: 50, b: 80 };

  /**
   * Whether to show disturbances visualization
   */
  showDisturbances = false;

  /**
   * Stroke weight for disturbance visualization
   */
  disturbanceStrokeWeight = 1;

  /**
   * Opacity of disturbance visualization (0-100)
   */
  disturbanceOpacity = 30;

  /**
   * Color for disturbances with positive theta (clockwise rotation)
   */
  disturbancePositiveColor = { h: 30, s: 80, b: 100 }; // Orange

  /**
   * Color for disturbances with negative theta (counter-clockwise rotation)
   */
  disturbanceNegativeColor = { h: 240, s: 80, b: 100 }; // Blue
}
