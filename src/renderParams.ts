import { type ColorPoint } from "./colorInterpolationSystem.ts";

export class RenderParams {
  /**
   * Visual rendering radius of each mote in pixels (typically much smaller than collision
   * radius). Rendered as ellipses with randomized specs (size, thickness, opacity, offset).
   */
  moteRenderRadius = 42 * 0.07;

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
}
