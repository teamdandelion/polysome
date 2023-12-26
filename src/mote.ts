import p5 from "p5";
import { RenderContext } from "./renderContext";

export class Mote {
  pos: p5.Vector;
  // aggregate collision force vector
  vCollide: p5.Vector;
  alive = true;
  radius: number;
  closestBoundary: number;

  constructor(pos: p5.Vector, radius: number) {
    this.pos = pos;
    this.vCollide = new p5.Vector(0, 0);
    this.closestBoundary = Infinity;
    this.radius = radius;
  }

  resetCollisions() {
    this.vCollide = new p5.Vector(0, 0);
    this.closestBoundary = Infinity;
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
  }

  render(rc: RenderContext) {
    let hue = 30;
    if (this.closestBoundary != Infinity) {
      const cDist = this.closestBoundary - this.radius;
      if (cDist < 0) {
        hue = 80 + cDist * -1;
      } else {
        hue = 30 + 50 * (1 - cDist / 10);
      }
    }
    rc.stroke(hue, 100, 100, 100);
    rc.noFill();
    rc.circle(this.pos.x, this.pos.y, this.radius);
  }
}
