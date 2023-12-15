import randomSeed from "./randomSeed.js";

// Note that the index order [0, 1, 2, 3] is little-endian
const eps = Math.pow(2, -32),
  m0 = 0x7f2d,
  m1 = 0x4c95,
  m2 = 0xf42d,
  m3 = 0x5851, // 6364136223846793005
  a0 = 0x814f,
  a1 = 0xf767,
  a2 = 0x7b7e,
  a3 = 0x1405; // 1442695040888963407

export function makeSeededRng(hash: string /*: bytes32 */) /*: Rng */ {
  const rng = new Rng();
  rng.setSeed(hash);
  return rng;
}

export function makeUnseededRng() /*: Rng */ {
  return makeSeededRng(randomSeed());
}

export class Rng {
  _state: Uint16Array;
  _dv: DataView;
  _nG: number | null;
  _hNG: boolean;

  constructor() {
    this._state = new Uint16Array(4);
    this._dv = new DataView(this._state.buffer);
    this._nG = null; // nextGaussian
    this._hNG = false; // hasNextGaussian
  }

  // sets the seed to a tokenData hash string "0x..."
  setSeed(hash: string) {
    this._hNG = false;
    this._nG = null;
    const nBytes = ~~((hash.length - 2) / 2);
    const bytes: number[] = [];
    for (let j = 0; j < nBytes; j++) {
      const e0 = 2 + 2 * j;
      bytes.push(parseInt(hash.slice(e0, e0 + 2), 16));
    }

    // to keep it simple, we just use 32bit murmur2 with two different seeds
    const seed_a = 1690382925;
    const seed_b = 72970470;
    const lower = hash32(bytes, seed_a);
    const upper = hash32(bytes, seed_b);
    this._dv.setUint32(0, lower);
    this._dv.setUint32(4, upper);
  }

  // random value between 0..1
  rnd() {
    const state = this._state;
    // Advance internal state
    const s0 = state[0],
      s1 = state[1],
      s2 = state[2],
      s3 = state[3],
      new0 = (a0 + m0 * s0) | 0,
      new1 = (a1 + m0 * s1 + (m1 * s0 + (new0 >>> 16))) | 0,
      new2 = (a2 + m0 * s2 + m1 * s1 + (m2 * s0 + (new1 >>> 16))) | 0,
      new3 = a3 + m0 * s3 + (m1 * s2 + m2 * s1) + (m3 * s0 + (new2 >>> 16));
    (state[0] = new0), (state[1] = new1), (state[2] = new2);
    state[3] = new3;

    // Calculate output function (XSH RR), uses old state
    const xorshifted =
        (s3 << 21) + (((s3 >> 2) ^ s2) << 5) + (((s2 >> 2) ^ s1) >> 11),
      out_int32 =
        (xorshifted >>> (s3 >> 11)) | (xorshifted << (-(s3 >> 11) & 31));
    return eps * (out_int32 >>> 0);
  }

  // random value between min (inclusive) and max (exclusive)
  uniform(min = 1, max: number | null = null) {
    if (max === null) {
      [min, max] = [0, min];
    }
    return this.rnd() * (max - min) + min;
  }

  // random gaussian distribution
  gauss(mean = 0, variance = 1) {
    // https://github.com/openjdk-mirror/jdk7u-jdk/blob/f4d80957e89a19a29bb9f9807d2a28351ed7f7df/src/share/classes/java/util/Random.java#L496
    if (this._hNG) {
      this._hNG = false;
      var result = this._nG as number;
      this._nG = null;
      return mean + variance * result;
    } else {
      var v1 = 0;
      var v2 = 0;
      var s = 0;
      do {
        v1 = this.rnd() * 2 - 1; // between -1 and 1
        v2 = this.rnd() * 2 - 1; // between -1 and 1
        s = v1 * v1 + v2 * v2;
      } while (s >= 1 || s === 0);
      var multiplier = Math.sqrt((-2 * Math.log(s)) / s);
      this._nG = v2 * multiplier;
      this._hNG = true;
      return mean + variance * (v1 * multiplier);
    }
  }

  odds(p: number) {
    return this.uniform() <= p;
  }

  choice<T>(items: T[]): T {
    return items[Math.floor(this.uniform(0, items.length))];
  }

  weightedChoice<T>(items: [T, number][]) {
    const sumWeight = items
      .map(([, weight]) => weight)
      .reduce((lhs, rhs) => lhs + rhs, 0);
    const bisection = sumWeight * this.uniform();

    let cumWeight = 0;
    for (let index = 0; index < items.length; index++) {
      const [value, weight] = items[index];
      cumWeight += weight;
      if (cumWeight >= bisection) {
        return value;
      }
    }

    const [lastValue] = items[items.length - 1];
    return lastValue;
  }

  // alias for weightedChoice
  wc<T>(items: [T, number][]) {
    return this.weightedChoice(items);
  }

  // a version of shuffle that safely uses our PRNG
  shuffle<T>(items: T[]): T[] {
    const joined: [number, T][] = items.map((item) => [
      this.uniform(0.0, 1.0),
      item,
    ]);

    joined.sort((a, b) => {
      return a[0] < b[0] ? -1 : 1;
    });

    return joined.map(([, item]) => item);
  }

  // returns a copy of the array that has been "winnowed" down to contain at most `num`
  // entries, while preserving the original order
  winnow<T>(input: T[], num: number): T[] {
    const items = input.slice();
    while (items.length > num) {
      const index = Math.floor(this.rnd() * items.length);
      items.splice(index, 1);
    }
    return items;
  }
}

// internally gets a 32-bit from tokenData hash bytes
function hash32(bytes: number[], seed = 0) {
  // murmur2 32bit
  // https://github.com/garycourt/murmurhash-js/blob/master/murmurhash2_gc.js
  const K = 16;
  const mask = 65535;
  const maskByte = 0xff;
  var m = 0x5bd1e995;
  var l = bytes.length,
    h = seed ^ l,
    i = 0,
    k;
  while (l >= 4) {
    k =
      (bytes[i] & maskByte) |
      ((bytes[++i] & maskByte) << 8) |
      ((bytes[++i] & maskByte) << 16) |
      ((bytes[++i] & maskByte) << 24);
    k = (k & mask) * m + ((((k >>> K) * m) & mask) << K);
    k ^= k >>> 24;
    k = (k & mask) * m + ((((k >>> K) * m) & mask) << K);
    h = ((h & mask) * m + ((((h >>> K) * m) & mask) << K)) ^ k;
    l -= 4;
    ++i;
  }
  /* eslint-disable no-fallthrough */
  switch (l) {
    case 3:
      h ^= (bytes[i + 2] & maskByte) << K;
    case 2:
      h ^= (bytes[i + 1] & maskByte) << 8;
    case 1:
      h ^= bytes[i] & maskByte;
      h = (h & mask) * m + ((((h >>> K) * m) & mask) << K);
  }
  /* eslint-enable no-fallthrough */
  h ^= h >>> 13;
  h = (h & mask) * m + ((((h >>> K) * m) & mask) << K);
  h ^= h >>> 15;
  return h >>> 0;
}
