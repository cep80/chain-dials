import { describe, expect, it } from "vitest";
import {
  evaluateHypeRegime,
  median,
  regimeLiveFromBoard,
} from "@/lib/regime/evaluate";
import { STANCE_BY_REGIME, type RegimeLiveSnapshot } from "@/lib/regime/types";

function live(
  patch: Partial<RegimeLiveSnapshot> & { fundingBps: number[] },
): RegimeLiveSnapshot {
  return {
    oiScore: 0.6,
    volumeHeat: 20,
    asOf: 1_000,
    ...patch,
  };
}

describe("median", () => {
  it("returns the middle of an odd set", () => {
    expect(median([3, 1, 2])).toBe(2);
  });
});

describe("evaluateHypeRegime", () => {
  it("maps calm when funding is near still water", () => {
    const r = evaluateHypeRegime(live({ fundingBps: [1, 0.5, -0.2] }));
    expect(r.regime).toBe("calm");
    expect(r.stance).toBe("flat");
    expect(r.reasons[0]).toMatch(/still water/i);
  });

  it("maps crowded_long to short when tide is high and vault is dense", () => {
    const r = evaluateHypeRegime(live({ fundingBps: [12, 11, 13] }));
    expect(r.regime).toBe("crowded_long");
    expect(r.stance).toBe(STANCE_BY_REGIME.crowded_long);
    expect(r.reasons.join(" ")).toMatch(/Funding Tide high/i);
    expect(r.reasons.join(" ")).toMatch(/OI Vault dense/i);
  });

  it("maps crowded_short to long when tide is low and vault is dense", () => {
    const r = evaluateHypeRegime(live({ fundingBps: [-12, -11, -10] }));
    expect(r.regime).toBe("crowded_short");
    expect(r.stance).toBe("long");
  });

  it("maps stressed when |funding| is crowded and volume sprays", () => {
    const r = evaluateHypeRegime(
      live({ fundingBps: [12, 10, 11], volumeHeat: 85 }),
    );
    expect(r.regime).toBe("stressed");
    expect(r.stance).toBe("flat");
    expect(r.reasons.join(" ")).toMatch(/Volume Fountain/i);
  });

  it("maps funding_extreme regardless of OI", () => {
    const r = evaluateHypeRegime(
      live({ fundingBps: [40, 38, 42], oiScore: 0.1, volumeHeat: 10 }),
    );
    expect(r.regime).toBe("funding_extreme");
    expect(r.stance).toBe("reduce");
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("holds crowded_long across a tiny funding dip (hysteresis)", () => {
    const r = evaluateHypeRegime(
      live({ fundingBps: [7, 7.2, 6.8], oiScore: 0.6 }),
      {},
      "crowded_long",
    );
    expect(r.regime).toBe("crowded_long");
  });

  it("leaves crowded_long when funding actually cools", () => {
    const r = evaluateHypeRegime(
      live({ fundingBps: [1, 0.5, 0], oiScore: 0.6 }),
      {},
      "crowded_long",
    );
    expect(r.regime).toBe("calm");
  });

  it("allows an upgrade from crowded_long to stressed", () => {
    const r = evaluateHypeRegime(
      live({ fundingBps: [12, 11, 13], volumeHeat: 88 }),
      {},
      "crowded_long",
    );
    expect(r.regime).toBe("stressed");
  });

  it("returns low-confidence calm when there is no funding sample", () => {
    const r = evaluateHypeRegime(live({ fundingBps: [] }));
    expect(r.regime).toBe("calm");
    expect(r.stance).toBe("flat");
    expect(r.confidence).toBeLessThan(0.3);
  });

  it("prefers top-market funding samples when the book is thick enough", () => {
    const snap = regimeLiveFromBoard(
      {
        recentTxs: [
          { feeRate: 12 },
          { feeRate: 11 },
          { feeRate: 10 },
        ],
        baseFeeSeries: [1, 1, 1],
        securityScore: 0.5,
        issuanceProgress: 40,
      },
      9,
    );
    expect(snap.fundingBps).toEqual([12, 11, 10]);
    expect(snap.oiScore).toBe(0.5);
    expect(snap.volumeHeat).toBe(40);
  });
});
