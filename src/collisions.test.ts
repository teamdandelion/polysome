import p5 from "p5";
import { detectCollisions, Collidable } from "./collisions";

let nextMoteIndex = 0;
function m(x: number, y: number) {
  return {
    pos: new p5.Vector().set(x, y),
    name: `m${nextMoteIndex++}`,
  };
}

const TEST_SECTOR_SIZE = 50;
const TEST_WORLD_SIZE = 150;
const dc = (
  motes: Collidable[],
  extraRadius = 30,
  sectorSize = TEST_SECTOR_SIZE,
  worldSize = TEST_WORLD_SIZE
) => detectCollisions(motes, extraRadius, sectorSize, worldSize);

describe("detectCollisions", () => {
  it("errors on motes out of bounds", () => {
    const bad = [m(0, -1), m(-1, 0), m(0, 150), m(150, 0)];
    // Check that an error is thrown for each bad mote
    bad.forEach((mote) => {
      expect(() => dc([mote])).toThrow("Mote out of bounds");
    });
  });

  it("should return an empty array if there are no motes", () => {
    expect(dc([])).toEqual([]);
  });

  it("should return an empty array if there is only one mote", () => {
    expect(dc([m(0, 0)])).toEqual([]);
  });

  it("should return an empty array if there is only one mote, and sector size is large", () => {
    expect(dc([m(0, 0)], 0, 100, 100)).toEqual([]);
  });

  it("handles a case of two overlapping motes", () => {
    const m1 = m(0, 0);
    const m2 = m(0, 0);
    expect(dc([m1, m2])).toEqual([[m1, m2]]);
  });

  it("handles a case where motes don't overlap", () => {
    const m1 = m(0, 0);
    const m2 = m(3, 0);
    expect(dc([m1, m2], 1)).toEqual([]);
  });

  it("handles a case of two non-overlapping motes", () => {
    const m1 = m(0, 0);
    const m2 = m(2, 0);
    expect(dc([m1, m2], 1)).toEqual([]);
  });

  it("handles motes that collide across sector boundaries", () => {
    const m1 = m(0, 49);
    const m2 = m(0, 51);
    expect(dc([m1, m2])).toEqual([[m2, m1]]);
    expect(dc([m2, m1])).toEqual([[m2, m1]]);
  });

  it("handles motes that collide across sector boundaries (extended)", () => {
    // |  1  |  2  |  3  |
    // |  4  |  5  |  6  |
    // |  7  |  8  |  9  |

    const m1 = m(49, 49);
    const m2 = m(75, 49);
    const m3 = m(101, 49);
    const m4 = m(49, 75);
    const center = m(75, 75);
    const m5 = m(75, 75);
    const m6 = m(101, 75);
    const m7 = m(49, 101);
    const m8 = m(75, 101);
    const m9 = m(101, 101);
    const motes = [m1, m2, m3, m4, center, m5, m6, m7, m8, m9];
    const collisions = dc(motes, 50);
    const centerCollisions = collisions.filter(
      ([a, b]) => a === center || b === center
    );

    expect(centerCollisions).toEqual([
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
  const m0 = m(45, 45);
  const m1 = m(55, 45);
  const m2 = m(45, 55);
  const m3 = m(55, 55);

  const motes = [m0, m1, m2, m3];
  const collisions = dc(motes, 30, 50, 100);
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
  const m0 = m(45, 45);
  const m1 = m(55, 45);
  const m2 = m(45, 55);
  const m3 = m(55, 55);

  const motes = [m0, m1, m2, m3];
  const collisions = dc(motes, 0, 50, 100);

  expect(collisions).toEqual([]);
});
