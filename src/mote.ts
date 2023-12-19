import p5 from "p5";

export class Mote {
  pos: p5.Vector;
  // aggregate collision force vector
  vCollide: p5.Vector;
  // total collision magnitude
  mCollide: number;
  alive = true;

  constructor(pos: p5.Vector) {
    this.pos = pos;
    this.vCollide = new p5.Vector(0, 0);
    this.mCollide = 0;
  }

  resetCollisions() {
    this.vCollide = new p5.Vector(0, 0);
    this.mCollide = 0;
  }

  collide(other: Mote) {
    const v = p5.Vector.sub(this.pos, other.pos);
    const d = v.mag();
    const f = 10 / (d + 1);
    this.vCollide.add(v.copy().setMag(f));
    this.mCollide += f;
    if (this.mCollide > 200) {
      this.alive = false;
    }
  }
}
