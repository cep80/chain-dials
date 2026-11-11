import { describe, expect, it } from "vitest";
import { assembleWidget, halvingFor, hashrateFrom, retargetFrom, sparkFrom, SPARK_POINTS } from "./widget";
import type { PriceHistoryPayload } from "@/lib/price/types";

function history(prices: number[], changePct = 2.5): PriceHistoryPayload {
  return {
    chain: "btc",
    range: "24H",
    currency: "usd",
    source: "test",
    updatedAt: 0,
    points: prices.map((price, i) => ({ t: i * 300_000, price })),
    candles: [],
    stats: {
      open: prices[0]!,
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1]!,
      changeAbs: 0,
      changePct,
      volumeSum: null,
    },
  };
}

describe("halvingFor", () => {
  it("counts down to the next epoch boundary", () => {
    expect(halvingFor(840_000)).toMatchObject({ blocksLeft: 210_000, progress: 0, nextHeight: 1_050_000 });
    expect(halvingFor(840_000)!.issuedPct).toBeCloseTo(93.75, 2);
    const h = halvingFor(945_000)!;
    expect(h.blocksLeft).toBe(105_000);
    expect(h.progress).toBeCloseTo(0.5);
    expect(h.nextHeight).toBe(1_050_000);
  });

  it("rejects nonsense heights", () => {
    expect(halvingFor(-1)).toBeNull();
    expect(halvingFor(Number.NaN)).toBeNull();
  });
});

describe("sparkFrom", () => {
  it("resamples long series to the fixed width, keeping both ends", () => {
    const prices = Array.from({ length: 288 }, (_, i) => 100 + i);
    const s = sparkFrom(prices)!;
    expect(s.points).toHaveLength(SPARK_POINTS);
    expect(s.points[0]).toBe(0);
    expect(s.points[SPARK_POINTS - 1]).toBe(1);
    expect(s.low).toBe(100);
    expect(s.high).toBe(387);
  });

  it("draws a flat series at mid height and drops non-finite values", () => {
    expect(sparkFrom([5, Number.NaN, 5])!.points).toEqual([0.5, 0.5]);
    expect(sparkFrom([5])).toBeNull();
  });
});

describe("assembleWidget", () => {
  it("builds every section from healthy feeds", () => {
    const w = assembleWidget(
      {
        history: history([90_000, 91_000, 92_345.67], 2.6012),
        tip: { height: 925_000, hash: "00ab", timestamp: 1_700_000_000_000, source: "t" },
        fees: { fastestFee: 12, halfHourFee: 8, hourFee: 5, economyFee: 2 },
      },
      42,
    );
    expect(w.v).toBe(1);
    expect(w.at).toBe(42);
    expect(w.price).toEqual({ usd: 92_345.67, changePct24h: 2.6 });
    expect(w.block).toEqual({ height: 925_000, timestamp: 1_700_000_000_000, hash: "00ab" });
    expect(w.fees).toEqual({ fastest: 12, halfHour: 8, hour: 5, economy: 2 });
    expect(w.halving?.blocksLeft).toBe(125_000);
    expect(w.spark?.points).toEqual([0, 0.4263, 1]);
  });

  it("blanks only the sections whose feed failed", () => {
    const w = assembleWidget({
      history: null,
      tip: { height: 925_000, hash: null, timestamp: null, source: "t" },
      fees: { fastestFee: 12 },
    });
    expect(w.price).toBeNull();
    expect(w.spark).toBeNull();
    expect(w.fees).toBeNull();
    expect(w.block).toEqual({ height: 925_000, timestamp: null, hash: null });
  });
});

describe("hashrateFrom", () => {
  it("places the current hashrate within the month's range", () => {
    const raw = { currentHashrate: 900e18, hashrates: [{ timestamp: 1, avgHashrate: 800e18 }, { timestamp: 2, avgHashrate: 1000e18 }] };
    const h = hashrateFrom(raw)!;
    expect(h.current).toBe(900e18);
    expect(h.heat).toBeCloseTo(0.5, 2);
  });

  it("drops missing or zero readings", () => {
    expect(hashrateFrom(null)).toBeNull();
    expect(hashrateFrom({ currentHashrate: 0 })).toBeNull();
  });
});

describe("retargetFrom", () => {
  it("keeps progress and tolerates a missing change", () => {
    expect(retargetFrom({ progressPercent: 42.123, remainingBlocks: 1100 })).toEqual({ progress: 42.12, change: null, blocksLeft: 1100 });
    expect(retargetFrom({})).toBeNull();
  });
});
