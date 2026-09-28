import type { Page } from "@playwright/test";
import type { WalletLookup } from "../../src/lib/wallet/types";
import type { ChainSnapshot } from "../../src/lib/chains/snapshot";

export function snapshot(): ChainSnapshot {
  return {
    tip: { height: 100, hash: "abcdef", timestamp: Date.now(), source: "Test RPC" },
    feeFastest: 12, feeHalfHour: 10, feeHour: 8, feeEconomy: 6,
    baseFeeSeries: [8, 10, 12], prioritySeries: [1, 2, 3], mempoolCount: 1000, mempoolPressure: 25,
    feeHistogram: [], recentTxs: [], securityRaw: 100, securityScore: 0.7,
    epochProgress: 50, epochBlocksLeft: 500, issuanceProgress: 50, supplyProgress: 80,
    inflationRate: 4, burnEthPerBlock: 0.5, priceUsd: 3000, forgeLabel: "Test security", source: "Test RPC",
  };
}

export const ADDRESS_A = "0x1111111111111111111111111111111111111111";
export const ADDRESS_B = "0x2222222222222222222222222222222222222222";
export function wallet(address = ADDRESS_A, balance = 2): WalletLookup {
  return {
    fetchedAt: Date.now(), chainId: "eth", query: address, normalized: address,
    valid: true, source: "Test explorer", explorers: [], unit: "ETH",
    balanceNative: balance, pendingNative: null, receivedNative: null, sentNative: null,
    txCount: 3, note: null, tag: null, holdings: [], perp: null,
    txs: [
      { id: "incoming-tx", kind: "tx", confirmed: true, at: Date.now() - 60_000, height: 1, valueNative: 2, feeNative: 0.01, counterparty: ADDRESS_B, label: "Deposit" },
      { id: "outgoing-tx", kind: "tx", confirmed: true, at: Date.now() - 120_000, height: 1, valueNative: -1, feeNative: 0.01, counterparty: ADDRESS_B, label: "Withdrawal" },
      { id: "unknown-tx", kind: "sig", confirmed: null, at: null, height: null, valueNative: null, feeNative: null, counterparty: null, label: null },
    ],
  };
}

/** Keep UI tests deterministic and independent of live provider availability. */
export async function mockFeeds(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const bitcoin: Record<string, unknown> = {
      "/api/mempool/v1/prices": { USD: 100000, time: Date.now() / 1000 },
      "/api/mempool/mempool": { count: 1000, vsize: 2000000, total_fee: 300000, fee_histogram: [] },
      "/api/mempool/v1/fees/recommended": { fastestFee: 12, halfHourFee: 10, hourFee: 8, economyFee: 6, minimumFee: 1 },
      "/api/mempool/v1/difficulty-adjustment": { progressPercent: 50, difficultyChange: 2, remainingBlocks: 1008, estimatedRetargetDate: Date.now() + 86400000 },
      "/api/mempool/v1/mining/hashrate/3d": { currentHashrate: 1e21, currentDifficulty: 1e14 },
      "/api/mempool/v1/lightning/statistics/latest": { latest: { total_capacity: 500000000000, node_count: 10000, channel_count: 40000, added: new Date().toISOString() } },
      "/api/mempool/v1/blocks": [{ height: 900000, id: "abcdef", timestamp: Math.floor(Date.now() / 1000) }],
      "/api/mempool/mempool/recent": [],
      "/api/mempool/v1/fees/mempool-blocks": [],
    };
    if (url.pathname in bitcoin) return route.fulfill({ json: bitcoin[url.pathname] });
    if (url.pathname.includes("/wallet/")) return route.fulfill({ json: wallet(url.searchParams.get("address") ?? ADDRESS_A) });
    if (url.pathname === "/api/auth/session") return route.fulfill({ json: null });
    if (url.pathname === "/api/suite/prices") return route.fulfill({ json: { btc: 100000, eth: 3000, sol: 150, hype: 40 } });
    if (url.pathname.includes("/tip/")) return route.fulfill({ json: { height: 100, hash: "abcdef", timestamp: Date.now(), source: "Test RPC" } });
    if (url.pathname.includes("/snapshot/")) return route.fulfill({ json: snapshot() });
    if (url.pathname.includes("price-history")) {
      const points = Array.from({ length: 24 }, (_, i) => ({ t: Date.now() - (24 - i) * 3600_000, price: 3000 + i * 10 }));
      return route.fulfill({ json: { chain: url.searchParams.get("chain"), range: url.searchParams.get("range"), currency: "usd", source: "Fixture", updatedAt: Date.now(), points, candles: points.map((p) => ({ t: p.t, o: p.price - 2, h: p.price + 5, l: p.price - 5, c: p.price })), stats: { open: 3000, close: 3230, high: 3235, low: 2995, changeAbs: 230, changePct: 7.66, volumeSum: null } } });
    }
    return route.fulfill({ status: 503, json: { error: "Fixture unavailable" } });
  });
  await page.routeWebSocket(/mempool/, (socket) => socket.close());
}
