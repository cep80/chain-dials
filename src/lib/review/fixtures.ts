/**
 * Deterministic readings for the instrument review harness.
 * Every value is fixed except tip ages, which are offsets from the seed time so
 * cadence dials show a known age. Presentation reads these; nothing writes back.
 */

import type { ChainId } from "@/lib/chains/types";
import type { AtmosphereTx, ConnectionStatus, LiveSnapshot } from "@/types/metrics";

export type ReviewScenario = "nominal" | "late" | "empty";

export const REVIEW_SCENARIOS: Array<{ id: ReviewScenario; label: string; note: string }> = [
  { id: "nominal", label: "Nominal", note: "Ordinary readings with a fresh tip." },
  { id: "late", label: "Late tip", note: "Tip is 2.6 intervals old: the ordinary miss." },
  { id: "empty", label: "No data", note: "Feeds connecting; every instrument must show its unavailable state." },
];

export const REVIEW_TIP_HASH = "00000000000000000001a2f7c4e8b9d6a3f1e0c7b5d4a9f8e2c1b0d3a6f5e4c9";

const EMPTY: LiveSnapshot = {
  priceUsd: null, blockHeight: null, tipHash: null, tipTimestamp: null,
  mempoolCount: null, mempoolVsize: null, mempoolTotalFee: null,
  feeFastest: null, feeHalfHour: null, feeHour: null, feeEconomy: null, feeMinimum: null,
  hashrate: null, difficulty: null, retargetProgress: null, retargetChange: null, retargetBlocks: null, retargetDate: null,
  lnCapacitySats: null, lnNodes: null, lnChannels: null, lnUpdatedAt: null,
  recentTxs: [], feeHistogram: [], mempoolBlocks: [], baseFeeSeries: [], prioritySeries: [],
  mempoolPressure: null, securityScore: null, forgeLabel: null, issuanceProgress: null, supplyProgress: null,
  inflationRate: null, burnEthPerBlock: null, feedSource: null, lastRestAt: null, lastWsAt: null,
};

/** Small deterministic generator (mulberry32) so sample sets never change between runs. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleTxs(count: number, now: number, feeTop: number, seed = 7): AtmosphereTx[] {
  const rand = seeded(seed);
  return Array.from({ length: count }, (_, i) => {
    const feeRate = Math.max(1, Math.round(feeTop * Math.pow(rand(), 1.6) * 10) / 10);
    const vsize = 140 + Math.round(rand() * 900);
    return {
      txid: `review${i.toString(16).padStart(4, "0")}${"0".repeat(56)}`,
      feeRate,
      fee: Math.round(feeRate * vsize),
      vsize,
      value: Math.round(rand() * 2.5e8),
      seenAt: now - Math.round(rand() * 90_000),
      fresh: i < 6,
      kind: "tx",
    };
  });
}

function histogram(feeTop: number, seed = 11): [number, number][] {
  const rand = seeded(seed);
  return Array.from({ length: 14 }, (_, i) => {
    const feeRate = Math.round((feeTop * (i + 1)) / 14 * 10) / 10;
    const vsize = Math.round((1 - i / 14) * 2.4e6 * (0.6 + rand() * 0.8));
    return [feeRate, vsize];
  });
}

function series(count: number, base: number, swing: number, seed: number): number[] {
  const rand = seeded(seed);
  return Array.from({ length: count }, (_, i) => Math.round((base + Math.sin(i / 3) * swing + (rand() - 0.5) * swing * 0.6) * 1000) / 1000);
}

const TARGET_SECONDS: Record<ChainId, number> = { btc: 600, eth: 12, sol: 0.4, hype: 1 };

export function reviewTipAge(chainId: ChainId, scenario: ReviewScenario): number {
  const target = TARGET_SECONDS[chainId];
  if (scenario === "late") return target * 2.6;
  return chainId === "btc" ? 250 : target * 0.6;
}

function feeds(now: number): LiveSnapshot["feeds"] {
  const fresh = { updatedAt: now - 4_000, error: null, loading: false };
  return { prices: fresh, mempool: fresh, fees: fresh, blocks: fresh, hashrate: fresh, difficulty: fresh, lightning: fresh };
}

function btc(now: number): Partial<LiveSnapshot> {
  return {
    priceUsd: 101_250, blockHeight: 918_412, tipHash: REVIEW_TIP_HASH,
    mempoolCount: 48_213, mempoolVsize: 14_200_000, mempoolTotalFee: 1.9e8,
    feeFastest: 18, feeHalfHour: 14, feeHour: 9, feeEconomy: 4, feeMinimum: 1,
    hashrate: 9.1e20, difficulty: 1.52e14, retargetProgress: 62.4, retargetChange: 3.1, retargetBlocks: 758, retargetDate: now + 5 * 86_400_000,
    lnCapacitySats: 5.2e11, lnNodes: 12_400, lnChannels: 48_000, lnUpdatedAt: now - 3_600_000,
    recentTxs: sampleTxs(28, now, 60), feeHistogram: histogram(60), mempoolBlocks: [],
    feedSource: "Review fixture", lastRestAt: now - 4_000, lastWsAt: now - 1_000, feeds: feeds(now),
  };
}

function eth(now: number): Partial<LiveSnapshot> {
  return {
    priceUsd: 3_180, blockHeight: 23_410_552, tipHash: REVIEW_TIP_HASH,
    feeFastest: 14.2, feeHalfHour: 12.1, feeHour: 10.4, feeEconomy: 8.2,
    baseFeeSeries: series(24, 12, 5, 3), prioritySeries: series(24, 1.6, 0.9, 5),
    mempoolCount: null, mempoolPressure: 54, retargetProgress: 40.6, retargetBlocks: 19,
    securityScore: 0.78, forgeLabel: "1.04M validators", issuanceProgress: 58, supplyProgress: 93.4,
    burnEthPerBlock: 0.42, feedSource: "Review fixture", lastRestAt: now - 4_000, lastWsAt: null,
  };
}

function sol(now: number): Partial<LiveSnapshot> {
  return {
    priceUsd: 152, blockHeight: 318_204_117, tipHash: REVIEW_TIP_HASH,
    feeFastest: 1_200, feeHalfHour: 800, feeHour: 400, feeEconomy: 100,
    baseFeeSeries: series(24, 900, 400, 9), prioritySeries: series(24, 300, 120, 13),
    recentTxs: sampleTxs(20, now, 1_400, 21), feeHistogram: histogram(1_400, 23),
    mempoolCount: 2_840, mempoolPressure: 46, retargetProgress: 71.2, retargetBlocks: 124_500,
    securityScore: 0.7, forgeLabel: "380M SOL staked", issuanceProgress: 71.2, supplyProgress: 82.5, inflationRate: 4.6,
    feedSource: "Review fixture", lastRestAt: now - 2_000, lastWsAt: null,
  };
}

function hype(now: number): Partial<LiveSnapshot> {
  return {
    priceUsd: 41.2, blockHeight: 612_330_901, tipHash: REVIEW_TIP_HASH,
    feeFastest: 0.1, feeHalfHour: 0.1, feeHour: 0.1, feeEconomy: 0.1,
    baseFeeSeries: series(24, 0.8, 1.4, 31), prioritySeries: series(24, 0.4, 0.3, 37),
    mempoolCount: 1_180, mempoolPressure: 40, retargetProgress: 55, retargetBlocks: 44,
    securityScore: 0.62, forgeLabel: "OI $4.2B", issuanceProgress: 48, supplyProgress: 34, inflationRate: 5.3,
    feedSource: "Review fixture", lastRestAt: now - 2_000, lastWsAt: null,
  };
}

export function reviewFixture(chainId: ChainId, scenario: ReviewScenario, now: number): { live: LiveSnapshot; connection: ConnectionStatus } {
  if (scenario === "empty") return { live: { ...EMPTY }, connection: "connecting" };
  const base = chainId === "btc" ? btc(now) : chainId === "eth" ? eth(now) : chainId === "sol" ? sol(now) : hype(now);
  return {
    live: { ...EMPTY, ...base, tipTimestamp: now - reviewTipAge(chainId, scenario) * 1000 },
    connection: "connected",
  };
}
