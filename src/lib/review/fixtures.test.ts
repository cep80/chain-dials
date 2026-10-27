import { describe, expect, it } from "vitest";
import { reviewFixture, reviewTipAge, sampleTxs, seeded } from "./fixtures";

describe("review fixtures", () => {
  it("is deterministic between runs", () => {
    const a = seeded(42);
    const b = seeded(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(sampleTxs(5, 1_000_000, 50)).toEqual(sampleTxs(5, 1_000_000, 50));
  });

  it("places the tip at a known age for every chain and scenario", () => {
    const now = 1_700_000_000_000;
    expect(reviewFixture("btc", "nominal", now).live.tipTimestamp).toBe(now - 250_000);
    expect(reviewTipAge("eth", "late")).toBeCloseTo(31.2);
    expect(reviewTipAge("sol", "nominal")).toBeCloseTo(0.24);
    expect(reviewFixture("hype", "late", now).live.tipTimestamp).toBe(now - 2_600);
  });

  it("leaves every reading null in the empty scenario", () => {
    const { live, connection } = reviewFixture("btc", "empty", 1);
    expect(connection).toBe("connecting");
    expect(live.tipTimestamp).toBeNull();
    expect(live.recentTxs).toEqual([]);
    expect(live.securityScore).toBeNull();
  });

  it("gives each chain the fields its instruments read", () => {
    const now = 1_700_000_000_000;
    expect(reviewFixture("btc", "nominal", now).live.hashrate).toBeGreaterThan(0);
    expect(reviewFixture("eth", "nominal", now).live.baseFeeSeries).toHaveLength(24);
    expect(reviewFixture("sol", "nominal", now).live.inflationRate).toBe(4.6);
    expect(reviewFixture("hype", "nominal", now).live.forgeLabel).toBe("OI $4.2B");
  });
});
