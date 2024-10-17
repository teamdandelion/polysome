export class Vector {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(v: Vector): Vector {
    return new Vector(this.x + v.x, this.y + v.y);
  }

  sub(v: Vector): Vector {
    return new Vector(this.x - v.x, this.y - v.y);
  }

  mult(scalar: number): Vector {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  setMag(magnitude: number): Vector {
    const angle = this.angle();
    return new Vector(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }

  static fromAngle(angle: number): Vector {
    return new Vector(Math.cos(angle), Math.sin(angle));
  }

  static dist(v1: Vector, v2: Vector): number {
    return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
  }

  // Serialize the Vector to a plain object
  toJSON() {
    return { x: this.x, y: this.y };
  }

  // Deserialize a plain object to a Vector
  static fromJSON(json: { x: number; y: number }): Vector {
    return new Vector(json.x, json.y);
  }
}
