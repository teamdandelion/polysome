import p5 from "p5";

const MOTE_RADIUS = 8;

export class Mote {
  pos: p5.Vector;
  // aggregate collision force vector
  vCollide: p5.Vector;
  // total collision magnitude
  mCollide: number;
  alive = true;
  radius = MOTE_RADIUS;

  constructor(pos: p5.Vector) {
    this.pos = pos;
    this.vCollide = new p5.Vector(0, 0);
    this.mCollide = 0;
    this.radius = MOTE_RADIUS;
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

  render(p5: p5, converter: (v: p5.Vector) => p5.Vector) {
    const c = converter(this.pos);
    p5.stroke(30, 100, 100, 100);
    p5.noFill();
    p5.circle(c.x, c.y, this.radius);
  }
}
