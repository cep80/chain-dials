import { describe, expect, it } from "vitest";
import {
  altitudeY,
  buildHistLayers,
  feeBand,
  pressureBlocks,
} from "./atmosphere-math";

const fees = {
  fastest: 20,
  half: 12,
  hour: 6,
  economy: 2,
};

describe("atmosphere-math honesty", () => {
  it("feeBand ladders against live estimates", () => {
    expect(feeBand(25, fees)).toBe(3);
    expect(feeBand(20, fees)).toBe(3);
    expect(feeBand(15, fees)).toBe(2);
    expect(feeBand(8, fees)).toBe(1);
    expect(feeBand(3, fees)).toBe(0);
    expect(feeBand(0.5, fees)).toBe(0);
  });

  it("altitudeY puts higher fees nearer the top", () => {
    const h = 400;
    const hi = altitudeY(20, h, fees);
    const mid = altitudeY(6, h, fees);
    const lo = altitudeY(2, h, fees);
    expect(hi).toBeLessThan(mid);
    expect(mid).toBeLessThan(lo);
    expect(hi).toBeGreaterThan(0);
    expect(lo).toBeLessThan(h);
  });

  it("buildHistLayers weights by sqrt(vsize) and keeps fee rates", () => {
    const layers = buildHistLayers(
      [
        [2, 100_000],
        [20, 400_000],
        [0, 50_000],
      ],
      fees,
    );
    expect(layers).toHaveLength(2);
    const top = layers.find((l) => l.feeRate === 20)!;
    const bottom = layers.find((l) => l.feeRate === 2)!;
    expect(top.weight).toBeGreaterThan(bottom.weight);
    expect(top.band).toBe(3);
    expect(bottom.band).toBe(0);
  });

  it("pressureBlocks is vsize / 1e6", () => {
    expect(pressureBlocks(null)).toBeNull();
    expect(pressureBlocks(2_500_000)).toBe(2.5);
  });
});
