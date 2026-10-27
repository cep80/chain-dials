import { describe, expect, it } from "vitest";
import { FrameMetrics, percentile, startFrameSampler, summarizeFrames } from "./frame-metrics";

describe("frame metrics", () => {
  it("summarizes median, p95 and fps from frame deltas", () => {
    const summary = summarizeFrames([16, 16, 17, 16, 33, 16, 16, 16, 16, 16]);
    expect(summary.samples).toBe(10);
    expect(summary.medianMs).toBe(16);
    expect(summary.p95Ms).toBe(33);
    expect(summary.fps).toBe(56.18);
  });

  it("ignores invalid samples and reports nulls when empty", () => {
    expect(summarizeFrames([])).toEqual({ samples: 0, medianMs: null, p95Ms: null, fps: null });
    expect(summarizeFrames([Number.NaN, -1, 0, Number.POSITIVE_INFINITY]).samples).toBe(0);
    expect(percentile([], 50)).toBeNull();
  });

  it("keeps only the newest samples once the ring is full", () => {
    const metrics = new FrameMetrics(4);
    [1, 2, 3, 4, 5, 6].forEach((value) => metrics.push(value));
    expect(metrics.samples()).toEqual([3, 4, 5, 6]);
    expect(metrics.summary().samples).toBe(4);
    metrics.reset();
    expect(metrics.samples()).toEqual([]);
  });

  it("rejects a zero capacity", () => {
    expect(() => new FrameMetrics(0)).toThrow(RangeError);
  });

  it("samples rAF deltas without disturbing the buffer on read", () => {
    const callbacks: Array<(t: number) => void> = [];
    const metrics = new FrameMetrics(8);
    let cancelled: number | null = null;
    const stop = startFrameSampler(
      metrics,
      (cb) => { callbacks.push(cb); return callbacks.length; },
      (id) => { cancelled = id; },
    );
    callbacks[0]!(0);
    callbacks[1]!(16);
    callbacks[2]!(34);
    expect(metrics.summary().samples).toBe(2);
    expect(metrics.samples()).toEqual([16, 18]);
    stop();
    expect(cancelled).toBe(4);
  });
});
