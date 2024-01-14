import p5 from "p5";

import { Mote } from "./mote";

export type Sector = {
  motes: Mote[];
  i: number;
  j: number;
  min: p5.Vector;
  max: p5.Vector;
};

export type Collision = {
  a: Mote;
  b: Mote;
  d: number;
  v: p5.Vector; // vector from a to b
};

export class SectorTracker {
  sectorSize: number;
  bounds: p5.Vector;
  iMax: number;
  jMax: number;
  sectors: Sector[];

  constructor(sectorSize: number, bounds: p5.Vector) {
    this.sectorSize = sectorSize;
    this.bounds = bounds;
    this.iMax = Math.ceil(bounds.x / this.sectorSize);
    this.jMax = Math.ceil(bounds.y / this.sectorSize);

    this.sectors = [];
    for (let j = 0; j < this.jMax; j++) {
      for (let i = 0; i < this.iMax; i++) {
        const min = new p5.Vector(i * this.sectorSize, j * this.sectorSize);
        const max = new p5.Vector(
          (i + 1) * this.sectorSize,
          (j + 1) * this.sectorSize
        );
        this.sectors.push({
          motes: [],
          i,
          j,
          min,
          max,
        });
      }
    }
  }

  sectorFor(x: number, y: number): Sector {
    if (x >= this.bounds.x || y >= this.bounds.y || x < 0 || y < 0) {
      throw new Error("Position out of bounds");
    }
    const i = Math.floor(x / this.sectorSize);
    const j = Math.floor(y / this.sectorSize);
    return this.sectors[j * this.iMax + i];
  }

  sectorForIndex(i: number, j: number): Sector {
    if (i >= this.iMax || j >= this.jMax || i < 0 || j < 0) {
      throw new Error("Index out of bounds");
    }
    return this.sectors[j * this.iMax + i];
  }

  updatePositions(motes: Mote[]) {
    this.sectors.forEach((sector) => {
      sector.motes.length = 0;
    });
    motes.forEach((mote) => {
      if (
        mote.pos.x >= this.bounds.x ||
        mote.pos.y >= this.bounds.y ||
        mote.pos.x < 0 ||
        mote.pos.y < 0
      ) {
        throw new Error("Position out of bounds");
      }
      const i = Math.floor(mote.pos.x / this.sectorSize);
      const j = Math.floor(mote.pos.y / this.sectorSize);
      this.sectors[j * this.iMax + i].motes.push(mote);
    });
  }

  collisions(radius: number): Collision[] {
    if (radius > this.sectorSize) {
      throw new Error("radius must be less than sector size");
    }
    const collisions: Collision[] = [];
    for (const sector of this.sectors) {
      // compute collisions within this sector
      for (let i = 0; i < sector.motes.length; i++) {
        const mote1 = sector.motes[i];
        for (let j = i + 1; j < sector.motes.length; j++) {
          const mote2 = sector.motes[j];
          const dx = mote2.pos.x - mote1.pos.x;
          const dy = mote2.pos.y - mote1.pos.y;
          if (dx * dx + dy * dy < radius * radius) {
            const v = p5.Vector.sub(mote2.pos, mote1.pos);
            collisions.push({
              a: mote1,
              b: mote2,
              d: v.mag(),
              v,
            });
          }
        }
      }
      // compute collsisions with adjacent sectors
      const offsets = [
        { i: -1, j: -1 }, // Top left corner
        { i: 0, j: -1 }, // Top
        { i: 1, j: -1 }, // Top right corner
        { i: -1, j: 0 }, // Left
      ];
      for (const offset of offsets) {
        const i = sector.i + offset.i;
        const j = sector.j + offset.j;
        if (i >= 0 && i < this.iMax && j >= 0 && j < this.jMax) {
          const adjacentSector = this.sectorForIndex(i, j);
          for (const mote1 of sector.motes) {
            for (const mote2 of adjacentSector.motes) {
              const dx = mote2.pos.x - mote1.pos.x;
              const dy = mote2.pos.y - mote1.pos.y;
              if (dx * dx + dy * dy < radius * radius) {
                const v = p5.Vector.sub(mote2.pos, mote1.pos);
                collisions.push({
                  a: mote1,
                  b: mote2,
                  d: v.mag(),
                  v,
                });
              }
            }
          }
        }
      }
    }
    return collisions;
  }
}
