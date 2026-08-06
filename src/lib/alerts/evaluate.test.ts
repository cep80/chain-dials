import { describe, expect, it } from "vitest";
import { evaluateAlertRule } from "@/lib/alerts/evaluate";

const baseCtx = {
  nowMs: 1_000_000,
  targetBlockSeconds: 600,
  feeUnit: "sat/vB",
  tipNoun: "block",
  shortName: "BTC",
  sessionOpenPrice: 100,
};

const baseLive = {
  feeFastest: 20,
  tipTimestamp: 1_000_000 - 100_000,
  mempoolCount: 1000,
  mempoolPressure: 50,
  priceUsd: 100,
  securityScore: 0.4,
  forgeIntensity: 0.4,
};

describe("evaluateAlertRule (instrument + classic)", () => {
  it("fires fee_hot above threshold", () => {
    const fire = evaluateAlertRule(
      "fee_hot",
      { threshold: 15 },
      { ...baseLive, feeFastest: 40 },
      baseCtx,
      "btc",
    );
    expect(fire).not.toBeNull();
    expect(fire!.title).toMatch(/fees hot/i);
  });

  it("fires metronome_late when past target × multiplier", () => {
    const fire = evaluateAlertRule(
      "metronome_late",
      { multiplier: 1.2 },
      { ...baseLive, tipTimestamp: baseCtx.nowMs - 800_000 },
      baseCtx,
      "btc",
    );
    expect(fire).not.toBeNull();
    expect(fire!.pathHint).toBe("/btc?i=metronome");
    expect(fire!.body).toMatch(/800/);
  });

  it("does not fire metronome_late when on schedule", () => {
    const fire = evaluateAlertRule(
      "metronome_late",
      { multiplier: 1.2 },
      { ...baseLive, tipTimestamp: baseCtx.nowMs - 60_000 },
      baseCtx,
      "btc",
    );
    expect(fire).toBeNull();
  });

  it("fires atmosphere_pressure from intensity floor", () => {
    // pressure 200 → intensity 1.0
    const fire = evaluateAlertRule(
      "atmosphere_pressure",
      { intensity: 0.5 },
      { ...baseLive, mempoolPressure: 200 },
      baseCtx,
      "eth",
    );
    expect(fire).not.toBeNull();
    expect(fire!.pathHint).toBe("/eth?i=atmosphere");
  });

  it("fires forge_heat from score floor", () => {
    const fire = evaluateAlertRule(
      "forge_heat",
      { score: 0.6 },
      { ...baseLive, forgeIntensity: 0.85 },
      baseCtx,
      "sol",
    );
    expect(fire).not.toBeNull();
    expect(fire!.pathHint).toBe("/sol?i=forge");
  });
});
