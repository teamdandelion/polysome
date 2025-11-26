import { type ColorPoint } from "./colorInterpolationSystem.ts";

export class RenderParams {
  /**
   * Visual rendering radius of each mote in pixels (typically much smaller than collision
   * radius). Rendered as ellipses with randomized specs (size, thickness, opacity, offset).
   */
  moteRenderRadius = 42 * 0.07;

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
   * Enables debug overlay showing FPS, step counter, elapsed time, and mote count in the
   * top-right corner of the canvas. Useful for performance monitoring and troubleshooting.
   */
  debugMode = false;
}
