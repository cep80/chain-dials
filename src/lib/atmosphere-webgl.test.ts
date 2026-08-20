import { describe, expect, it } from "vitest";
import { fogLayersFromHist } from "@/lib/atmosphere-webgl";

describe("fogLayersFromHist", () => {
  it("normalizes altitude into 0-1 y", () => {
    const layers = fogLayersFromHist(
      [
        { feeRate: 50, weight: 0.8, band: 3 },
        { feeRate: 5, weight: 0.4, band: 0 },
      ],
      100,
      { fastest: 50, economy: 5 },
      (feeRate, h, fees) => {
        const top = fees.fastest ?? 10;
        const bottom = fees.economy ?? 1;
        const t = (feeRate - bottom) / (top - bottom || 1);
        return (1 - t) * h;
      },
    );
    expect(layers).toHaveLength(2);
    expect(layers[0]!.y).toBeCloseTo(0, 5);
    expect(layers[1]!.y).toBeCloseTo(1, 5);
    expect(layers[0]!.band).toBe(3);
  });
});
