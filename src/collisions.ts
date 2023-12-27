import p5 from "p5";

export interface Collidable {
  pos: p5.Vector;
  radius: number;
}

const SECTOR_SIZE = 50;
const WORLD_DIM = 1000;

function checkCollide(p1: p5.Vector, p2: p5.Vector, r: number) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy < r * r;
}

export function detectCollisions<T extends Collidable>(
  motes: T[],
  extraRadius: number,
  sectorSize = SECTOR_SIZE,
  worldDim = WORLD_DIM
): T[][] {
  if (
    sectorSize <= 0 ||
    worldDim <= 0 ||
    sectorSize > worldDim ||
    worldDim % sectorSize !== 0
  ) {
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
  });
  sectors.forEach((sector, index) => {
    let adjacentIndices: number[] = [];
    if (gridDimension === 1) {
      adjacentIndices = [];
    } else if (gridDimension === 2) {
      adjacentIndices = [
        index - gridDimension - 1, // top left
        index - gridDimension, // top
        index - 1, // left
      ];
    } else {
      adjacentIndices = [
        index - gridDimension - 1, // top left
        index - gridDimension, // top
        index - gridDimension + 1, // top right
        index - 1, // left
      ];
    }

    for (let i = 0; i < sector.length; i++) {
      const mote1 = sector[i];

      // Check for collisions within the current sector
      for (let j = i + 1; j < sector.length; j++) {
        const mote2 = sector[j];
        if (
          checkCollide(
            mote1.pos,
            mote2.pos,
            mote1.radius + mote2.radius + extraRadius
          )
        ) {
          results.push([mote1, mote2]);
        }
      }

      // Check for collisions within adjacent sectors
      adjacentIndices.forEach((adjacentIndex) => {
        if (adjacentIndex >= 0 && adjacentIndex < sectors.length) {
          const adjacentSector = sectors[adjacentIndex];
          for (let j = 0; j < adjacentSector.length; j++) {
            const mote2 = adjacentSector[j];
            if (
              checkCollide(
                mote1.pos,
                mote2.pos,
                mote1.radius + mote2.radius + extraRadius
              )
            ) {
              results.push([mote1, mote2]);
            }
          }
        }
      });
    }
  });
  return results;
}
