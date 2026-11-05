import { describe, expect, it } from "vitest";
import {
  chanceWithin,
  expectedBtcPerDay,
  formatChance,
  formatExpectedWait,
  formatOneIn,
  formatThs,
  soloOdds,
} from "@/lib/mining/solo-odds";
import { MINERS } from "@/lib/mining/miners";

const DIFFICULTY = 150e12;
const NETWORK = (DIFFICULTY * 2 ** 32) / 600;

describe("soloOdds", () => {
  it("gives the whole network one block per ten minutes", () => {
    const odds = soloOdds({ hashrate: NETWORK, difficulty: DIFFICULTY, networkHashrate: NETWORK })!;
    expect(odds.perBlock).toBe(1);
    expect(odds.expectedSeconds).toBeCloseTo(600, 6);
  });

  it("scales per-block odds by share of network hash", () => {
    const odds = soloOdds({ hashrate: NETWORK / 1e6, difficulty: DIFFICULTY, networkHashrate: NETWORK })!;
    expect(odds.perBlock).toBeCloseTo(1e-6, 12);
    expect(odds.perDay).toBeCloseTo(144e-6, 7);
  });

  it("falls back to the difficulty-implied network hashrate", () => {
    const odds = soloOdds({ hashrate: NETWORK / 1000, difficulty: DIFFICULTY, networkHashrate: null })!;
    expect(odds.perBlock).toBeCloseTo(1e-3, 12);
  });

  it("returns null without usable inputs", () => {
    expect(soloOdds({ hashrate: 0, difficulty: DIFFICULTY, networkHashrate: NETWORK })).toBeNull();
    expect(soloOdds({ hashrate: 1e12, difficulty: 0, networkHashrate: NETWORK })).toBeNull();
  });

  it("keeps precision for lottery-sized rates", () => {
    expect(chanceWithin(1e-20, 86_400)).toBeGreaterThan(0);
  });

  it("keeps every catalog miner's yearly odds in range", () => {
    const odds = MINERS.map((m) =>
      soloOdds({ hashrate: m.ths * 1e12, difficulty: DIFFICULTY, networkHashrate: NETWORK })!,
    );
    for (const o of odds) {
      expect(o.perYear).toBeGreaterThan(0);
      expect(o.perYear).toBeLessThanOrEqual(1);
    }
  });

  it("computes smoothed expected BTC", () => {
    const odds = soloOdds({ hashrate: NETWORK, difficulty: DIFFICULTY, networkHashrate: NETWORK })!;
    expect(expectedBtcPerDay(odds, 3.125)).toBeCloseTo(450, 6);
  });
});

describe("formatters", () => {
  it("formats odds", () => {
    expect(formatOneIn(1 / 4_300_000)).toBe("1 in 4.3M");
    expect(formatOneIn(0.75)).toBe("75%");
    expect(formatChance(0.0123)).toBe("1.2%");
    expect(formatChance(0.42)).toBe("42%");
    expect(formatChance(0.994)).toBe("99%");
    expect(formatChance(0.996)).toBe("99.6%");
    expect(formatChance(0.9994)).toBe("99.9%");
    expect(formatChance(0.99999)).toBe(">99.9%");
    expect(formatChance(1e-7)).toBe("1 in 10M");
    expect(formatChance(null)).toBe("-");
  });

  it("formats waits", () => {
    expect(formatExpectedWait(600)).toBe("10 min");
    expect(formatExpectedWait(36 * 3_600)).toBe("36 h");
    expect(formatExpectedWait(30 * 86_400)).toBe("30 days");
    expect(formatExpectedWait(500 * 365.25 * 86_400)).toBe("500 years");
    expect(formatExpectedWait(1e30)).toMatch(/age of the universe/);
  });

  it("formats hashrate units", () => {
    expect(formatThs(0.000_000_078)).toBe("78 kH/s");
    expect(formatThs(1.2)).toBe("1.2 TH/s");
    expect(formatThs(473)).toBe("473 TH/s");
    expect(formatThs(1_000_000)).toBe("1 EH/s");
  });
});
