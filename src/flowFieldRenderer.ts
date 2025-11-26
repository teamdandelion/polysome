import { FlowField } from "./flowField.ts";
import { RenderContext } from "./renderContext.ts";
import { RenderParams } from "./renderParams.ts";
import { Vector } from "./vector.ts";

export class FlowFieldRenderer {
  private params: RenderParams;
  private flowField: FlowField;

  constructor(params: RenderParams, flowField: FlowField) {
    this.params = params;
    this.flowField = flowField;
  }

  render(rc: RenderContext) {
    if (!this.params.showFlowField) {
      return;
    }

    const spacing = this.flowField.bounds.x / this.flowField.fieldPoints.length;
    const stepSize = this.params.flowFieldStepSize;
    const numSteps = this.params.flowFieldNumSteps;

    // Set up rendering style
    rc.strokeWeight(this.params.flowFieldStrokeWeight);
    rc.noFill();

    // Iterate through field points
    for (let i = 0; i < this.flowField.fieldPoints.length; i += this.params.flowFieldSampleRate) {
      for (let j = 0; j < this.flowField.fieldPoints[i].length; j += this.params.flowFieldSampleRate) {
        const x = spacing * i;
        const y = spacing * j;

        // Compute forward trajectory
        const forwardPoints = this.computeTrajectory(x, y, stepSize, numSteps, 1);

        // Compute backward trajectory
        const backwardPoints = this.computeTrajectory(x, y, stepSize, numSteps, -1);

        // Draw the streamline
        this.drawStreamline(rc, backwardPoints.reverse(), forwardPoints);
      }
    }
  }

  private computeTrajectory(
    startX: number,
    startY: number,
    stepSize: number,
    numSteps: number,
    direction: number
  ): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    let x = startX;
    let y = startY;
    const flowVector = new Vector(0, 0);

    for (let step = 0; step < numSteps; step++) {
      // Check bounds
      if (!this.flowField.inBounds(new Vector(x, y))) {
        break;
      }

      points.push({ x, y });

      // Get flow direction at current position
      this.flowField.flow(x, y, stepSize * direction, flowVector);

      x += flowVector.x;
      y += flowVector.y;
    }

    return points;
  }

  private drawStreamline(
    rc: RenderContext,
    backwardPoints: Array<{ x: number; y: number }>,
    forwardPoints: Array<{ x: number; y: number }>,
  ) {
    const allPoints = [...backwardPoints, ...forwardPoints];

    if (allPoints.length < 2) {
      return;
    }

    // Set color with low opacity
    rc.stroke(
      this.params.flowFieldColor.h,
      this.params.flowFieldColor.s,
      this.params.flowFieldColor.b,
      this.params.flowFieldOpacity
    );

    // Draw the curve as a series of lines
    rc.ctx.beginPath();
    const [startX, startY] = rc.convert(allPoints[0].x, allPoints[0].y);
    rc.ctx.moveTo(startX, startY);

    for (let i = 1; i < allPoints.length; i++) {
      const [px, py] = rc.convert(allPoints[i].x, allPoints[i].y);
      rc.ctx.lineTo(px, py);
    }

    rc.ctx.stroke();
  }
}
