import p5 from "p5";

export interface Collidable {
  pos: p5.Vector;
  radius: number;
}

const SECTOR_SIZE = 50;
const WORLD_DIM = 1000;

export function detectCollisions<T extends Collidable>(
  motes: T[],
  sectorSize = SECTOR_SIZE,
  worldDim = WORLD_DIM
): T[][] {
  if (sectorSize <= 0 || worldDim <= 0 || sectorSize > worldDim) {
    throw new Error("invalid sector configuration");
  }
  const results: T[][] = [];
  const gridDimension = worldDim / sectorSize;
  const sectors: T[][] = new Array(gridDimension * gridDimension)
    .fill(null)
    .map(() => []);
  motes.forEach((mote) => {
    if (mote.radius < 0 || !Number.isFinite(mote.radius)) {
      throw new Error("Mote has invalid radius");
    }
    const { pos, radius } = mote;
    if (pos.x >= worldDim || pos.x < 0 || pos.y >= worldDim || pos.y < 0) {
      debugger;
      throw new Error("Mote out of bounds");
    }
    const i = Math.floor(mote.pos.x / sectorSize);
    const j = Math.floor(mote.pos.y / sectorSize);

    sectors[j * gridDimension + i].push(mote);
    console.log(
      `mote ${mote.pos.x}, ${mote.pos.y} in sector ${j * gridDimension + i}`
    );
  });
  sectors.forEach((sector, index) => {
    const adjacentIndices = [
      index - gridDimension - 1, // top left
      index - gridDimension, // top
      index - gridDimension + 1, // top right
      index - 1, // left
      /*
      index + 1, // right
      index + gridDimension - 1, // bottom left
      index + gridDimension, // bottom
      index + gridDimension + 1, // bottom right
      */
    ];

    for (let i = 0; i < sector.length; i++) {
      const mote1 = sector[i];

      // Check for collisions within the current sector
      for (let j = i + 1; j < sector.length; j++) {
        const mote2 = sector[j];
        if (mote1.pos.dist(mote2.pos) < mote1.radius + mote2.radius) {
          results.push([mote1, mote2]);
        }
      }

      // Check for collisions within adjacent sectors
      adjacentIndices.forEach((adjacentIndex) => {
        if (adjacentIndex >= 0 && adjacentIndex < sectors.length) {
          const adjacentSector = sectors[adjacentIndex];
          for (let j = 0; j < adjacentSector.length; j++) {
            const mote2 = adjacentSector[j];
            if (mote1.pos.dist(mote2.pos) < mote1.radius + mote2.radius) {
              results.push([mote1, mote2]);
            }
          }
        }
      });
    }
  });
  return results;
}
