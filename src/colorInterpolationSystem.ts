// colorInterpolationSystem.ts

export interface ColorPoint {
  collisions: number;
  color: { h: number; s: number; b: number };
}

export class ColorInterpolationSystem {
  private colorPoints: ColorPoint[];

  constructor(colorPoints: ColorPoint[]) {
    this.colorPoints = colorPoints.sort((a, b) => a.collisions - b.collisions);
  }

  getColor(collisions: number): { h: number; s: number; b: number } {
    if (collisions <= this.colorPoints[0].collisions) {
      return this.colorPoints[0].color;
    }

    if (
      collisions >= this.colorPoints[this.colorPoints.length - 1].collisions
    ) {
      return this.colorPoints[this.colorPoints.length - 1].color;
    }

    let lowerIndex = 0;
    let upperIndex = 1;

    while (collisions > this.colorPoints[upperIndex].collisions) {
      lowerIndex++;
      upperIndex++;
    }

    const lowerPoint = this.colorPoints[lowerIndex];
    const upperPoint = this.colorPoints[upperIndex];

    const t =
      (collisions - lowerPoint.collisions) /
      (upperPoint.collisions - lowerPoint.collisions);

    return {
      h: this.interpolate(lowerPoint.color.h, upperPoint.color.h, t),
      s: this.interpolate(lowerPoint.color.s, upperPoint.color.s, t),
      b: this.interpolate(lowerPoint.color.b, upperPoint.color.b, t),
    };
  }

  private interpolate(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }
}
