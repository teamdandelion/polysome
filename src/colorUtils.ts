/**
 * Converts HSB (Hue, Saturation, Brightness) color values to RGB string
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param b Brightness (0-100)
 * @param a Alpha (0-100), defaults to 100
 * @returns CSS rgba string
 */
export function hsbToRgb(
  h: number,
  s: number,
  b: number,
  a: number = 100
): string {
  // Normalize inputs
  h = h % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  b = Math.max(0, Math.min(100, b)) / 100;
  a = Math.max(0, Math.min(100, a)) / 100;

  const c = b * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = b - c;

  let r = 0,
    g = 0,
    b_ = 0;

  if (h < 60) {
    r = c;
    g = x;
    b_ = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b_ = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b_ = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b_ = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b_ = c;
  } else {
    r = c;
    g = 0;
    b_ = x;
  }

  const red = Math.round((r + m) * 255);
  const green = Math.round((g + m) * 255);
  const blue = Math.round((b_ + m) * 255);

  return `rgba(${red}, ${green}, ${blue}, ${a})`;
}
