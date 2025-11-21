/**
 * Performance metrics map: key -> time in milliseconds
 */
export type PerfMap = Map<string, number>;

/**
 * Single performance record with step number and metrics
 */
type PerfRecord = {
  step: number;
  perf: PerfMap;
};

/**
 * Circular buffer for storing and analyzing performance metrics over time.
 * Supports recording metrics per step, computing averages, and formatted logging.
 */
export class PerfBuffer {
  private buffer: PerfRecord[] = [];
  private maxSize: number;
  private currentIndex: number = 0;
  private isFull: boolean = false;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Record performance metrics for a given step.
   * Automatically manages the circular buffer, overwriting old entries when full.
   */
  recordPerf(step: number, perf: PerfMap): void {
    const record = { step, perf };

    if (this.buffer.length < this.maxSize) {
      this.buffer.push(record);
    } else {
      this.isFull = true;
      this.buffer[this.currentIndex] = record;
    }

    this.currentIndex = (this.currentIndex + 1) % this.maxSize;
  }

  /**
   * Get the most recent performance record.
   */
  getLatest(): PerfRecord | null {
    if (this.buffer.length === 0) return null;
    const index = this.isFull
      ? (this.currentIndex - 1 + this.maxSize) % this.maxSize
      : this.buffer.length - 1;
    return this.buffer[index];
  }

  /**
   * Get the last N performance records.
   * Throws an error if N exceeds the number of available records.
   */
  getLast(n: number): PerfRecord[] {
    if (n > this.buffer.length) {
      throw new Error(
        `Cannot get last ${n} records: only ${this.buffer.length} records available`
      );
    }

    const records: PerfRecord[] = [];

    for (let i = 0; i < n; i++) {
      const index = this.isFull
        ? (this.currentIndex - 1 - i + this.maxSize) % this.maxSize
        : this.buffer.length - 1 - i;
      records.push(this.buffer[index]);
    }

    return records.reverse(); // Return in chronological order
  }

  /**
   * Compute average performance metrics over the last N steps.
   * Returns a PerfMap with averaged values.
   */
  averagePerf(lookback: number): PerfMap {
    const records = this.getLast(lookback);
    if (records.length === 0) return new Map();

    const sums = new Map<string, number>();
    const counts = new Map<string, number>();

    for (const record of records) {
      for (const [key, value] of record.perf) {
        sums.set(key, (sums.get(key) || 0) + value);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }

    const averages = new Map<string, number>();
    for (const [key, sum] of sums) {
      averages.set(key, sum / counts.get(key)!);
    }

    return averages;
  }

  /**
   * Format a performance map using a template string.
   * Template variables are prefixed with $ and replaced with values from the PerfMap.
   *
   * Example template: "Frame $step: simulator=$simulator render=$render"
   *
   * @param template - Template string with $variable placeholders
   * @param perf - PerfMap containing the values to substitute
   */
  static formatPerf(template: string, perf: PerfMap): string {
    let result = template;

    // Replace all perf keys
    for (const [key, value] of perf) {
      const placeholder = new RegExp(`\\$${key}`, "g");
      result = result.replace(placeholder, value.toFixed(2));
    }

    return result;
  }

  /**
   * Log the latest performance record using a template string.
   */
  logPerf(template: string): void {
    const latest = this.getLatest();
    if (!latest) {
      console.log("No performance data recorded yet");
      return;
    }

    console.log(PerfBuffer.formatPerf(template, latest.perf));
  }

  /**
   * Log averaged performance over the last N steps using a template string.
   */
  logAveragePerf(lookback: number, template: string): void {
    const avg = this.averagePerf(lookback);
    const records = this.getLast(lookback);

    if (records.length === 0) {
      console.log("No performance data recorded yet");
      return;
    }

    console.log(
      `Average over last ${records.length} steps:`,
      PerfBuffer.formatPerf(template, avg)
    );
  }
}
