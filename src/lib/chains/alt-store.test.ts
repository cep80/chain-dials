import { describe, expect, it } from "vitest";
import { useAltChainStore } from "./alt-store";
import type { ChainSnapshot } from "./snapshot";

const snap = (height: number): ChainSnapshot => ({
  tip: { height, hash: `block-${height}`, timestamp: height, source: "Fixture" },
  feeFastest: 12, feeHalfHour: 10, feeHour: 8, feeEconomy: 6, baseFeeSeries: [], prioritySeries: [],
  mempoolCount: 100, mempoolPressure: 20, feeHistogram: [], recentTxs: [], securityRaw: 100, securityScore: 0.8,
  epochProgress: 50, epochBlocksLeft: 200, issuanceProgress: 50, supplyProgress: 75, inflationRate: 4,
  burnEthPerBlock: 0.1, priceUsd: 3000, forgeLabel: "Fixture", source: "Fixture",
});

describe("alternate-chain snapshot races", () => {
  it("keeps a faster tip while still accepting fresh fees from a slower snapshot", () => {
    useAltChainStore.getState().applySnapshot(snap(100), 3000);
    useAltChainStore.getState().applyTip({ height: 102, hash: "new-tip", timestamp: 102, source: "Fixture" });
    const tipAt = useAltChainStore.getState().live.lastTipAt;
    useAltChainStore.getState().applySnapshot({ ...snap(101), feeFastest: 19 }, 3100);
    const live = useAltChainStore.getState().live;
    expect(live.blockHeight).toBe(102);
    expect(live.tipHash).toBe("new-tip");
    expect(live.tipTimestamp).toBe(102);
    expect(live.lastTipAt).toBe(tipAt);
    expect(live.feeFastest).toBe(19);
    expect(live.priceUsd).toBe(3100);
  });
});
