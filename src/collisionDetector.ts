import { Mote } from "./mote";

const SECTOR_SIZE = 50;

export function collisions(motes: Mote[]) {
  const gridDimension = 1000 / SECTOR_SIZE;
  const sectors: Mote[][] = new Array(gridDimension * gridDimension)
    .fill(null)
    .map(() => []);
  motes.forEach((mote) => {
    const i = Math.floor(mote.pos.x / SECTOR_SIZE);
    const j = Math.floor(mote.pos.y / SECTOR_SIZE);
    if (i >= gridDimension || j >= gridDimension) {
      debugger;
      throw new Error("Mote out of bounds");
    }
    sectors[i * gridDimension + j].push(mote);
  });
  sectors.forEach((sector, index) => {
    const adjacentIndices = [
      index - gridDimension - 1, // top left
      index - gridDimension, // top
      index - gridDimension + 1, // top right
      index - 1, // left
      index + 1, // right
      index + gridDimension - 1, // bottom left
      index + gridDimension, // bottom
      index + gridDimension + 1, // bottom right
    ];

    for (let i = 0; i < sector.length; i++) {
      const mote1 = sector[i];

      // Check for collisions within the current sector
      for (let j = i + 1; j < sector.length; j++) {
        const mote2 = sector[j];
        if (mote1.pos.dist(mote2.pos) < 10) {
          mote1.collide(mote2);
          mote2.collide(mote1);
        }
      }

      // Check for collisions within adjacent sectors
      adjacentIndices.forEach((adjacentIndex) => {
        if (adjacentIndex >= 0 && adjacentIndex < sectors.length) {
          const adjacentSector = sectors[adjacentIndex];
          for (let j = 0; j < adjacentSector.length; j++) {
            const mote2 = adjacentSector[j];
            if (mote1.pos.dist(mote2.pos) < 10) {
              mote1.collide(mote2);
              mote2.collide(mote1);
            }
          }
        }
      });
    }
  });
}
