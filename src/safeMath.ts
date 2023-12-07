// Helpful math functions, adapted from safeMath.js in qql-art/frontend

export function pi(v: number): number {
  return Math.PI * v;
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function snap(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function clip(
  value: number,
  min: number | null = null,
  max: number | null = null
) {
  value = max !== null ? Math.min(value, max) : value;
  value = min !== null ? Math.max(value, min) : value;
  return value;
}

export function rescale(
  value: number,
  oldMin: number,
  oldMax: number,
  newMin: number,
  newMax: number
) {
  const clipped = clip(value, oldMin, oldMax);
  const oldSpread = oldMax - oldMin;
  const newSpread = newMax - newMin;
  return newMin + (clipped - oldMin) * (newSpread / oldSpread);
}

// linear interpolation
export function lrp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function average(...args: number[]): number {
  return args.reduce((lhs, rhs) => lhs + rhs, 0) / args.length;
}

export function sqrt(
  value: number,
  maxIterations = 1000,
  epsilon = 1e-14,
  target = 1e-7
) {
  if (value < 0) {
    throw new Error("Value must be non-negative.");
  }

  let guess = value;
  for (let index = 0; index < maxIterations; index++) {
    const error = guess * guess - value;
    if (Math.abs(error) <= target) {
      return guess;
    }

    const divisor = 2 * guess;
    if (divisor <= epsilon) {
      return guess;
    }

    guess -= error / divisor;
  }

  return guess;
}

export function dist(x1: number, y1: number, x2: number, y2: number) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return sqrt(dx * dx + dy * dy);
}

// "Fast" atan2 implementation using a polynomial approximation.
// Adapted from https://stackoverflow.com/questions/46210708.
export function atan2(y: number, x: number): number {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const mx = Math.max(ay, ax);
  const mn = Math.min(ay, ax);
  const a = mn / mx;
  /* Minimax polynomial approximation to atan(a) on [0,1] */
  const s = a * a;
  const c = s * a;
  const q = s * s;
  let r = 0.024840285 * q + 0.18681418;
  let t = -0.094097948 * q - 0.33213072;
  r = r * s + t;
  r = r * c + a;
  /* Map to full circle */
  if (ay > ax) r = 1.57079637 - r;
  if (x < 0) r = 3.14159274 - r;
  if (y < 0) r = -r;
  return r;
}

// Build an interpolation-based lookup function from a given table.
// The function is assumed period, so given values outside the range will wrap.
function buildInterpolator(table: number[], min: number, max: number) {
  return (value: number) => {
    // Coerce value to [min, max) assuming periodicity.
    value = mod(value - min, max - min) + min;

    const rescaled = rescale(value, min, max, 0, table.length - 1);
    const index = Math.floor(rescaled); // This is within [0, table.length - 1).
    const fraction = rescaled - index; // This is within [0, 1).

    // Function evaluated at value is within [start, end) based on index.
    const start = table[index];
    const end = table[index + 1];

    // Interpolate within [start, end) using fractional part.
    return lrp(start, end, fraction);
  };
}

const cosTable = [
  1.0, 0.99179, 0.96729, 0.92692, 0.87132, 0.80141, 0.71835, 0.62349, 0.51839,
  0.40478, 0.28453, 0.1596, 0.03205, -0.09602, -0.22252, -0.34537, -0.46254,
  -0.57212, -0.6723, -0.76145, -0.83809, -0.90097, -0.94906, -0.98156, -0.99795,
  -0.99795, -0.98156, -0.94906, -0.90097, -0.83809, -0.76145, -0.6723, -0.57212,
  -0.46254, -0.34537, -0.22252, -0.09602, 0.03205, 0.1596, 0.28453, 0.40478,
  0.51839, 0.62349, 0.71835, 0.80141, 0.87132, 0.92692, 0.96729, 0.99179, 1.0,
];

export const cos = buildInterpolator(cosTable, 0, 2 * Math.PI);

const sinTable = [
  0.0, 0.12788, 0.25365, 0.37527, 0.49072, 0.59811, 0.69568, 0.78183, 0.85514,
  0.91441, 0.95867, 0.98718, 0.99949, 0.99538, 0.97493, 0.93847, 0.8866,
  0.82017, 0.74028, 0.64823, 0.54553, 0.43388, 0.31511, 0.19116, 0.06407,
  -0.06407, -0.19116, -0.31511, -0.43388, -0.54553, -0.64823, -0.74028,
  -0.82017, -0.8866, -0.93847, -0.97493, -0.99538, -0.99949, -0.98718, -0.95867,
  -0.91441, -0.85514, -0.78183, -0.69568, -0.59811, -0.49072, -0.37527,
  -0.25365, -0.12788, -0.0,
];

export const sin = buildInterpolator(sinTable, 0, 2 * Math.PI);

export function angle(x1: number, y1: number, x2: number, y2: number): number {
  const a = atan2(y2 - y1, x2 - x1);
  return mod(a, pi(2.0));
}

// Fast upper bound of `dist()` function.
export function distUpperBound(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);

  const min = Math.min(dx, dy);
  const max = Math.max(dx, dy);

  const alpha = 1007 / 1110;
  const beta = 441 / 1110;

  return alpha * max + beta * min;
}

// Fast lower bound of `dist()` function.
export function distLowerBound(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);

  const min = Math.min(dx, dy);
  const max = Math.max(dx, dy);

  const beta = 441 / 1024;

  return max + beta * min;
}

export function addPolarOffset(
  x: number,
  y: number,
  theta: number,
  magnitude: number
): number[] {
  return [x + magnitude * cos(theta), y + magnitude * sin(theta)];
}
