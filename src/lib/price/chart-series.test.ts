import { describe, expect, it } from "vitest";
import { chartPoints, chartCandles, nearestSample, seriesSegments } from "@/lib/price/chart-series";
import { parseChartPreferences } from "@/lib/price/preferences";

describe("chart series", () => {
  it("sorts samples, removes invalid prices and timestamps, and deduplicates timestamps", () => {
    expect(chartPoints([{ t: 2, price: 2 }, { t: 1, price: 1 }, { t: 2, price: 3 }, { t: NaN, price: 4 }, { t: 3, price: -1 }])).toEqual([{ t: 1, price: 1 }, { t: 2, price: 3 }]);
    expect(chartCandles([{ t: 1, o: 2, h: 1, l: 1, c: 2 }])).toEqual([]);
  });
  it("leaves missing time intervals unconnected", () => {
    const points = [0, 1, 2, 9, 10, 11].map((t) => ({ t: t * 1000, price: 5 }));
    expect(seriesSegments(points).map((segment) => segment.map((p) => p.t))).toEqual([[0, 1000, 2000], [9000, 10000, 11000]]);
  });
  it("selects by time rather than array index, including edge and gap cases", () => {
    const rows = [0, 1, 2, 9, 10].map((t) => ({ t }));
    expect(nearestSample(rows, -1)).toBe(0);
    expect(nearestSample(rows, 20)).toBe(4);
    expect(nearestSample(rows, 3)).toBe(2);
    expect(nearestSample(rows, 8)).toBe(3);
    expect(nearestSample([], 8)).toBe(0);
  });
  it("validates preferences from local storage", () => {
    expect(parseChartPreferences({ range: "30D", mode: "candle" })).toEqual({ range: "30D", mode: "candle" });
    expect(parseChartPreferences({ range: "bad", mode: "bad" })).toEqual({});
    expect(parseChartPreferences(null)).toEqual({});
  });
});
