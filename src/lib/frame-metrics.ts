/**
 * Bounded ring buffer of frame times. Querying it never disturbs the samples,
 * so a review harness can read median, p95 and fps while the loop keeps running.
 * Numbers are estimates from requestAnimationFrame deltas, not GPU timings.
 */

export interface FrameSummary {
  samples: number;
  medianMs: number | null;
  p95Ms: number | null;
  fps: number | null;
}

export function percentile(sorted: readonly number[], p: number): number | null {
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index]!;
}

export function summarizeFrames(samples: readonly number[]): FrameSummary {
  const clean = samples.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!clean.length) return { samples: 0, medianMs: null, p95Ms: null, fps: null };
  const total = clean.reduce((sum, value) => sum + value, 0);
  return {
    samples: clean.length,
    medianMs: round(percentile(clean, 50)!),
    p95Ms: round(percentile(clean, 95)!),
    fps: round((clean.length / total) * 1000),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export class FrameMetrics {
  private readonly buffer: number[];
  private head = 0;
  private filled = 0;

  constructor(private readonly capacity = 240) {
    if (!Number.isInteger(capacity) || capacity <= 0) throw new RangeError("capacity must be a positive integer");
    this.buffer = new Array<number>(capacity).fill(0);
  }

  push(frameMs: number): void {
    if (!Number.isFinite(frameMs) || frameMs <= 0) return;
    this.buffer[this.head] = frameMs;
    this.head = (this.head + 1) % this.capacity;
    this.filled = Math.min(this.capacity, this.filled + 1);
  }

  reset(): void {
    this.head = 0;
    this.filled = 0;
  }

  samples(): number[] {
    if (this.filled < this.capacity) return this.buffer.slice(0, this.filled);
    return [...this.buffer.slice(this.head), ...this.buffer.slice(0, this.head)];
  }

  summary(): FrameSummary {
    return summarizeFrames(this.samples());
  }
}

/** Sample requestAnimationFrame deltas into `metrics` until the returned stop() runs. */
export function startFrameSampler(
  metrics: FrameMetrics,
  raf: (cb: (t: number) => void) => number = (cb) => requestAnimationFrame(cb),
  cancel: (id: number) => void = (id) => cancelAnimationFrame(id),
): () => void {
  let last: number | null = null;
  let id = 0;
  const tick = (time: number) => {
    if (last != null) metrics.push(time - last);
    last = time;
    id = raf(tick);
  };
  id = raf(tick);
  return () => cancel(id);
}
