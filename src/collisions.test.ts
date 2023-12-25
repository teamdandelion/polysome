/**
 * @jest-environment jsdom
 */

import p5 from "p5";
import { detectCollisions, Collidable } from "./collisions";

function m(x: number, y: number, r: number) {
  return { pos: new p5.Vector().set(x, y), radius: r };
}

const dc = detectCollisions;

describe("detectCollisions", () => {
  it("errors on motes out of bounds", () => {
    const bad = [m(0, -1, 1), m(-1, 0, 1), m(0, 1001, 1), m(1000, 1000, 1)];
    // Check that an error is thrown for each bad mote
    bad.forEach((mote) => {
      expect(() => dc([mote])).toThrow("Mote out of bounds");
    });
    expect(() => dc([m(0, 0, -1)])).toThrow("Mote has invalid radius");
  });

  it("errors on invalid radii", () => {
    const bad = [
      m(0, 0, -1),
      m(0, 0, NaN),
      m(0, 0, Infinity),
      m(0, 0, -Infinity),
    ];
    // Check that an error is thrown for each bad mote
    bad.forEach((mote) => {
      expect(() => dc([mote])).toThrow("invalid radius");
    });
  });

  it("should return an empty array if there are no motes", () => {
    expect(dc([])).toEqual([]);
  });

  it("handles a case of two overlapping motes", () => {
    const m1 = m(0, 0, 1);
    const m2 = m(0, 0, 1);
    expect(dc([m1, m2])).toEqual([[m1, m2]]);
  });

  it("handles a case of two non-overlapping motes", () => {
    const m1 = m(0, 0, 1);
    const m2 = m(2, 0, 1);
    expect(dc([m1, m2])).toEqual([]);
  });

  it("handles motes that collide across sector boundaries", () => {
    const m1 = m(0, 49, 5);
    const m2 = m(0, 51, 5);
    expect(dc([m1, m2])).toEqual([[m2, m1]]);
    expect(dc([m2, m1])).toEqual([[m2, m1]]);
  });

  it("handles motes that collide across sector boundaries (extended)", () => {
    // |  1  |  2  |  3  |
    // |  4  |  5  |  6  |
    // |  7  |  8  |  9  |

    const m1 = m(49, 49, 10);
    const m2 = m(75, 49, 10);
    const m3 = m(101, 49, 10);
    const m4 = m(49, 75, 10);
    const center = m(75, 75, 40);
    const m5 = m(75, 75, 10);
    const m6 = m(101, 75, 10);
    const m7 = m(49, 101, 10);
    const m8 = m(75, 101, 10);
    const m9 = m(101, 101, 10);
    const motes = [m1, m2, m3, m4, center, m5, m6, m7, m8, m9];

    expect(dc(motes, 50, 150)).toEqual([
      [center, m5], // Checks own-sector collisions first
      [center, m1],
      [center, m2],
      [center, m3],
      [center, m4],
      [m6, center],
      [m7, center],
      [m8, center],
      [m9, center],
    ]);
  });
});

/*
|  1  |  2  |  3  |
|  4  |  5  |  6  |
|  7  |  8  |  9  |
*/
