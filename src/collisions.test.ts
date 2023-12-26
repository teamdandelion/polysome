/**
 * @jest-environment jsdom
 */

import p5 from "p5";
import { detectCollisions, Collidable } from "./collisions";

let nextMoteIndex = 0;
function m(x: number, y: number, r: number) {
  return {
    pos: new p5.Vector().set(x, y),
    radius: r,
    name: `m${nextMoteIndex++}`,
  };
}

const TEST_SECTOR_SIZE = 50;
const TEST_WORLD_SIZE = 150;
const dc = (
  motes: Collidable[],
  extraRadius = 0,
  sectorSize = TEST_SECTOR_SIZE,
  worldSize = TEST_WORLD_SIZE
) => detectCollisions(motes, extraRadius, sectorSize, worldSize);

describe("detectCollisions", () => {
  it("errors on motes out of bounds", () => {
    const bad = [m(0, -1, 1), m(-1, 0, 1), m(0, 150, 1), m(150, 0, 1)];
    // Check that an error is thrown for each bad mote
    bad.forEach((mote) => {
      expect(() => dc([mote])).toThrow("Mote out of bounds");
    });
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

  it("should return an empty array if there is only one mote", () => {
    expect(dc([m(0, 0, 5)])).toEqual([]);
  });

  it("should return an empty array if there is only one mote, and sector size is large", () => {
    expect(dc([m(0, 0, 5)], 0, 100, 100)).toEqual([]);
  });

  it("handles a case of two overlapping motes", () => {
    const m1 = m(0, 0, 1);
    const m2 = m(0, 0, 1);
    expect(dc([m1, m2])).toEqual([[m1, m2]]);
  });

  it("handles a case where motes don't overlap", () => {
    const m1 = m(0, 0, 1);
    const m2 = m(3, 0, 1);
    expect(dc([m1, m2], 0)).toEqual([]);
  });

  it("handles a case where motes don't overlap, but do due to extraRadius", () => {
    const m1 = m(0, 0, 1);
    const m2 = m(3, 0, 1);
    expect(dc([m1, m2], 3)).toEqual([[m1, m2]]);
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

    expect(dc(motes)).toEqual([
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

it("handles motes collisions in a 2x2 sector setup)", () => {
  // |  0  |  1  |
  // |  2  |  3  |
  nextMoteIndex = 0;
  const m0 = m(45, 45, 30);
  const m1 = m(55, 45, 30);
  const m2 = m(45, 55, 30);
  const m3 = m(55, 55, 30);

  const motes = [m0, m1, m2, m3];
  const collisions = dc(motes, 0, 50, 100);
  expect(
    collisions.map(([m1, m2]) => [(m1 as any).name, (m2 as any).name])
  ).toHaveLength(6);

  expect(collisions).toEqual([
    [m1, m0],
    [m2, m0],
    [m2, m1],
    [m3, m0],
    [m3, m1],
    [m3, m2],
  ]);
});

it("handles motes collisions in non-colliding 2x2 sector setup)", () => {
  // |  0  |  1  |
  // |  2  |  3  |
  nextMoteIndex = 0;
  const m0 = m(45, 45, 3);
  const m1 = m(55, 45, 3);
  const m2 = m(45, 55, 3);
  const m3 = m(55, 55, 3);

  const motes = [m0, m1, m2, m3];
  const collisions = dc(motes, 0, 50, 100);

  expect(collisions).toEqual([]);
});
