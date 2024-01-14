import p5 from "p5";

import { Mote } from "./mote";

export type Sector = {
  motes: Mote[];
  i: number;
  j: number;
  min: p5.Vector;
  max: p5.Vector;
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
}
