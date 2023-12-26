import p5 from "p5";
import { RenderContext } from "./renderContext";

export class Mote {
  pos: p5.Vector;
  // aggregate collision force vector
  vCollide: p5.Vector;
  alive = true;
  radius: number;
  closestBoundary = Infinity;
  nCollisions = 0;

  constructor(pos: p5.Vector, radius: number) {
    this.pos = pos;
    this.vCollide = new p5.Vector(0, 0);
    this.radius = radius;
  }

  resetCollisions() {
    this.vCollide = new p5.Vector(0, 0);
    this.closestBoundary = Infinity;
    this.nCollisions = 0;
  }

  collide(other: Mote, influenceRadius: number) {
    const v = p5.Vector.sub(this.pos, other.pos);
    const d = v.mag();
    const boundaryDistance = d - this.radius - other.radius;
    let forceFactor;
    if (boundaryDistance < 0) {
      forceFactor = 2;
    } else {
      forceFactor = (influenceRadius - boundaryDistance) / influenceRadius;
    }
    this.vCollide.add(v.copy().setMag(forceFactor));
    this.closestBoundary = Math.min(this.closestBoundary, boundaryDistance);
    this.nCollisions++;
  }

  render(rc: RenderContext) {
    let hue = 30 + this.nCollisions * 6;
    rc.strokeWeight(2);
    rc.stroke(hue, 100, 40 + this.nCollisions, 80);
    rc.noFill();
    rc.circle(this.pos.x, this.pos.y, this.radius);
  }
}
