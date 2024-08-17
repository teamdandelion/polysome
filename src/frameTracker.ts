import p5 from "p5";

export class FrameTracker {
  frames: p5.Vector[];
  stepsPerFrame: number;
  step: number;
  frameIndex: number;
  nFrames: number;

  constructor(pos: p5.Vector, nFrames: number, stepsPerFrame: number) {
    this.frames = Array.from({ length: nFrames }, () => pos.copy());
    this.nFrames = nFrames;
    this.stepsPerFrame = stepsPerFrame;
    this.step = 0;
    this.frameIndex = 0;
  }

  store(pos: p5.Vector) {
    if (this.step % this.stepsPerFrame == 0) {
      this.frames[this.frameIndex] = pos.copy();
      this.frameIndex = (this.frameIndex + 1) % this.nFrames;
    }
    this.step++;
  }

  get(): Array<p5.Vector> {
    const frames = [];
    for (let i = 0; i < this.frames.length; i++) {
      const index =
        (this.frameIndex - i + this.frames.length) % this.frames.length;
      frames.push(this.frames[index]);
    }
    return frames;
  }
}
