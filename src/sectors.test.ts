import p5 from "p5";

import { Mote } from "./mote";
import { SectorTracker } from "./sectors";

function m(x: number, y: number): Mote {
  return new Mote(new p5.Vector(x, y));
}

describe("SectorTracker", () => {
  it("sets up sectors appropriately (square)", () => {
    const st = new SectorTracker(10, new p5.Vector(100, 100));
    expect(st.sectors.length).toEqual(100);
    const s0Expected = {
      motes: [],
      i: 0,
      j: 0,
      min: new p5.Vector(0, 0),
      max: new p5.Vector(10, 10),
    };
    expect(st.sectors[0]).toEqual(s0Expected);
    expect(st.sectorFor(0, 0)).toEqual(s0Expected);
    const s1Expected = {
      motes: [],
      i: 1,
      j: 0,
      min: new p5.Vector(10, 0),
      max: new p5.Vector(20, 10),
    };
    expect(st.sectorFor(11, 0)).toEqual(s1Expected);

    expect(st.sectors[1]).toEqual(s1Expected);
    const s99Expected = {
      motes: [],
      i: 9,
      j: 9,
      min: new p5.Vector(90, 90),
      max: new p5.Vector(100, 100),
    };
    expect(st.sectorFor(99, 99)).toEqual(s99Expected);
  });
  it("sets up sectors appropriately (non square)", () => {
    const st = new SectorTracker(10, new p5.Vector(20, 40));
    expect(st.sectors.length).toEqual(8);
    expect(st.sectorFor(0, 0)).toEqual({
      motes: [],
      i: 0,
      j: 0,
      min: new p5.Vector(0, 0),
      max: new p5.Vector(10, 10),
    });
    expect(st.sectorFor(11, 0)).toEqual({
      motes: [],
      i: 1,
      j: 0,
      min: new p5.Vector(10, 0),
      max: new p5.Vector(20, 10),
    });

    expect(st.sectorFor(19, 39)).toEqual({
      motes: [],
      i: 1,
      j: 3,
      min: new p5.Vector(10, 30),
      max: new p5.Vector(20, 40),
    });
  });
  it("sets up sectors appropriately (non divisible)", () => {
    const st = new SectorTracker(10, new p5.Vector(21, 41));
    expect(st.sectors.length).toEqual(15);
    expect(st.sectorFor(0, 0)).toEqual({
      motes: [],
      i: 0,
      j: 0,
      min: new p5.Vector(0, 0),
      max: new p5.Vector(10, 10),
    });
    expect(st.sectorFor(11, 0)).toEqual({
      motes: [],
      i: 1,
      j: 0,
      min: new p5.Vector(10, 0),
      max: new p5.Vector(20, 10),
    });

    expect(st.sectorFor(20.5, 40.5)).toEqual({
      motes: [],
      i: 2,
      j: 4,
      min: new p5.Vector(20, 40),
      max: new p5.Vector(30, 50),
    });
  });
  it("places motes in the right sectors", () => {
    const st = new SectorTracker(10, new p5.Vector(100, 100));
    const m1 = m(0, 0);
    const m2 = m(9, 9);

    const m3 = m(10, 10);
    const m4 = m(0, 10);
    const m5 = m(99, 99);
    st.updatePositions([m1, m2, m3, m4, m5]);
    const s0 = st.sectorFor(0, 0);
    expect(s0.motes).toEqual([m1, m2]);
    const s1 = st.sectorFor(0, 10);
    expect(s1.motes).toEqual([m4]);
  });
  it("updatePositions works", () => {
    const st = new SectorTracker(10, new p5.Vector(100, 100));
    const m1 = m(0, 0);
    const m2 = m(9, 9);

    const m3 = m(10, 10);
    const m4 = m(0, 10);
    const m5 = m(99, 99);
    st.updatePositions([m1, m2, m3, m4, m5]);
    st.updatePositions([]);
    let s0 = st.sectorFor(0, 0);
    expect(s0.motes).toEqual([]);
    const s1 = st.sectorFor(0, 10);
    expect(s1.motes).toEqual([]);
    const m6 = m(9.999, 9.999);
    st.updatePositions([m1, m2, m3, m4, m5, m6]);
    s0 = st.sectorFor(0, 0);
    expect(s0.motes).toEqual([m1, m2, m6]);
  });

  describe("collisions", () => {
    function c(a: Mote, b: Mote) {
      const v = p5.Vector.sub(b.pos, a.pos);
      return {
        a,
        b,
        d: v.mag(),
        v,
      };
    }
    it("handles a simple case of non-colliding modes", () => {
      const m1 = m(0, 0);
      const m2 = m(9, 9);
      const st = new SectorTracker(10, new p5.Vector(100, 100));
      st.updatePositions([m1, m2]);
      expect(st.collisions(5)).toEqual([]);
    });
    it("handles a simple case of colliding modes", () => {
      const m1 = m(0, 0);
      const m2 = m(3, 3);
      const st = new SectorTracker(10, new p5.Vector(100, 100));
      st.updatePositions([m1, m2]);
      expect(st.collisions(10)).toEqual([c(m1, m2)]);
    });
    it("handles the top-left (or bottom right) corner", () => {
      const a = m(9, 9);
      const b = m(11, 11);
      const st = new SectorTracker(10, new p5.Vector(100, 100));
      st.updatePositions([a, b]);
      expect(st.collisions(10)).toEqual([c(b, a)]);
      st.updatePositions([b, a]);
      expect(st.collisions(10)).toEqual([c(b, a)]);
    });
    it("handles the top (or bottom) edge", () => {
      const a = m(9, 9);
      const b = m(9, 11);
      const st = new SectorTracker(10, new p5.Vector(100, 100));
      st.updatePositions([a, b]);
      expect(st.collisions(10)).toEqual([c(b, a)]);
      st.updatePositions([b, a]);
      expect(st.collisions(10)).toEqual([c(b, a)]);
    });
    it("handles the top-right (or bottom left) corner", () => {
      const a = m(11, 9);
      const b = m(9, 11);
      const st = new SectorTracker(10, new p5.Vector(100, 100));
      st.updatePositions([a, b]);
      expect(st.collisions(10)).toEqual([c(b, a)]);
      st.updatePositions([b, a]);
      expect(st.collisions(10)).toEqual([c(b, a)]);
    });
    it("handles the left (or right) edge", () => {
      const a = m(9, 9);
      const b = m(11, 9);
      const st = new SectorTracker(10, new p5.Vector(100, 100));
      st.updatePositions([a, b]);
      expect(st.collisions(10)).toEqual([c(b, a)]);
      st.updatePositions([b, a]);
      expect(st.collisions(10)).toEqual([c(b, a)]);
    });
  });
});
