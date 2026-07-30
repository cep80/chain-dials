import { create } from "zustand";
import type { ChainId } from "@/lib/chains/types";
import type { ChainSnapshot } from "@/lib/chains/snapshot";
import type { TipSnapshot } from "@/lib/chains/fetch";
import type { ConnectionStatus } from "@/types/metrics";

export interface AltLive {
  priceUsd: number | null;
  blockHeight: number | null;
  tipHash: string | null;
  tipTimestamp: number | null;
  feeFastest: number | null;
  feeHalfHour: number | null;
  feeHour: number | null;
  feeEconomy: number | null;
  mempoolCount: number | null;
  mempoolPressure: number | null;
  feeHistogram: [number, number][];
  recentTxs: ChainSnapshot["recentTxs"];
  baseFeeSeries: number[];
  prioritySeries: number[];
  securityScore: number | null;
  securityRaw: number | null;
  forgeLabel: string | null;
  epochProgress: number | null;
  epochBlocksLeft: number | null;
  issuanceProgress: number | null;
  supplyProgress: number | null;
  inflationRate: number | null;
  burnEthPerBlock: number | null;
  lastAt: number | null;
  source: string | null;
}

interface AltChainState {
  chainId: ChainId | null;
  connection: ConnectionStatus;
  now: number;
  live: AltLive;
  boardPulse: number;
  applySnapshot: (snap: ChainSnapshot, priceUsd: number | null) => void;
  applyTip: (tip: TipSnapshot) => void;
  setConnection: (c: ConnectionStatus) => void;
  tick: () => void;
  start: (chainId: ChainId) => () => void;
}

const empty: AltLive = {
  priceUsd: null,
  blockHeight: null,
  tipHash: null,
  tipTimestamp: null,
  feeFastest: null,
  feeHalfHour: null,
  feeHour: null,
  feeEconomy: null,
  mempoolCount: null,
  mempoolPressure: null,
  feeHistogram: [],
  recentTxs: [],
  baseFeeSeries: [],
  prioritySeries: [],
  securityScore: null,
  securityRaw: null,
  forgeLabel: null,
  epochProgress: null,
  epochBlocksLeft: null,
  issuanceProgress: null,
  supplyProgress: null,
  inflationRate: null,
  burnEthPerBlock: null,
  lastAt: null,
  source: null,
};

export const useAltChainStore = create<AltChainState>((set, get) => {
  let snapTimer: ReturnType<typeof setInterval> | null = null;
  let tipTimer: ReturnType<typeof setInterval> | null = null;
  let priceTimer: ReturnType<typeof setInterval> | null = null;
  let clockTimer: ReturnType<typeof setInterval> | null = null;
  let refs = 0;
  let activeChain: ChainId | null = null;
  let lastPrice: number | null = null;

  async function pollPrice(chainId: ChainId) {
    try {
      const res = await fetch("/api/suite/prices", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const prices = (await res.json()) as Partial<Record<ChainId, number>>;
      lastPrice = prices[chainId] ?? lastPrice;
      if (lastPrice != null) {
        set({ live: { ...get().live, priceUsd: lastPrice } });
      }
    } catch {
      // keep last; snapshot may still seed a mark price
    }
  }

  async function pollSnapshot(chainId: ChainId) {
    try {
      const res = await fetch(`/api/suite/snapshot/${chainId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      const snap = (await res.json()) as ChainSnapshot & { priceUsd?: number | null };
      if (typeof snap.priceUsd === "number" && Number.isFinite(snap.priceUsd)) {
        lastPrice = snap.priceUsd;
      }
      get().applySnapshot(snap, lastPrice);
      set({ connection: "connected" });
    } catch {
      set({
        connection: get().live.lastAt ? "degraded" : "disconnected",
      });
    }
  }

  async function pollTip(chainId: ChainId) {
    try {
      const res = await fetch(`/api/suite/tip/${chainId}`, { cache: "no-store" });
      if (!res.ok) return;
      const tip = (await res.json()) as TipSnapshot;
      get().applyTip(tip);
    } catch {
      // tip is best-effort between heavy snapshots
    }
  }

  function teardown() {
    if (snapTimer) clearInterval(snapTimer);
    if (tipTimer) clearInterval(tipTimer);
    if (priceTimer) clearInterval(priceTimer);
    if (clockTimer) clearInterval(clockTimer);
    snapTimer = tipTimer = priceTimer = clockTimer = null;
    activeChain = null;
  }

  return {
    chainId: null,
    connection: "connecting",
    now: Date.now(),
    live: empty,
    boardPulse: 0,
    tick: () => set({ now: Date.now() }),
    setConnection: (c) => set({ connection: c }),
    applyTip: (tip) => {
      const prev = get().live.blockHeight;
      const height = tip.height;
      const advanced =
        height != null && prev != null && height > prev;
      const same =
        height != null && prev != null && height === prev;
      set({
        live: {
          ...get().live,
          blockHeight: height ?? get().live.blockHeight,
          tipHash: tip.hash ?? get().live.tipHash,
          // Always accept a real tip time; only freeze when height is unchanged
          // and we already have a timestamp (keeps “since tip” from resetting).
          tipTimestamp:
            same && get().live.tipTimestamp != null
              ? get().live.tipTimestamp
              : (tip.timestamp ?? get().live.tipTimestamp ?? Date.now()),
          lastAt: Date.now(),
          source: tip.source
            ? `${get().live.source?.split("+")[0] ?? tip.source}+tip`
            : get().live.source,
        },
        boardPulse: advanced ? get().boardPulse + 1 : get().boardPulse,
        connection: "connected",
      });
    },
    applySnapshot: (snap, priceUsd) => {
      const prev = get().live.blockHeight;
      const height = snap.tip.height;
      const pulsed =
        height != null && prev != null && height > prev
          ? get().boardPulse + 1
          : get().boardPulse;
      const sameHeight =
        height != null && prev != null && height === prev;
      const snapPrice =
        typeof (snap as { priceUsd?: number }).priceUsd === "number"
          ? (snap as { priceUsd?: number }).priceUsd!
          : null;
      set({
        live: {
          ...get().live,
          priceUsd: priceUsd ?? snapPrice ?? get().live.priceUsd,
          blockHeight: height,
          tipHash: snap.tip.hash,
          tipTimestamp:
            sameHeight && get().live.tipTimestamp != null
              ? get().live.tipTimestamp
              : (snap.tip.timestamp ?? get().live.tipTimestamp ?? Date.now()),
          feeFastest: snap.feeFastest,
          feeHalfHour: snap.feeHalfHour,
          feeHour: snap.feeHour,
          feeEconomy: snap.feeEconomy,
          mempoolCount: snap.mempoolCount,
          mempoolPressure: snap.mempoolPressure,
          feeHistogram: snap.feeHistogram,
          recentTxs: snap.recentTxs,
          baseFeeSeries: snap.baseFeeSeries,
          prioritySeries: snap.prioritySeries,
          securityScore: snap.securityScore,
          securityRaw: snap.securityRaw,
          forgeLabel: snap.forgeLabel,
          epochProgress: snap.epochProgress,
          epochBlocksLeft: snap.epochBlocksLeft,
          issuanceProgress: snap.issuanceProgress,
          supplyProgress: snap.supplyProgress,
          inflationRate: snap.inflationRate,
          burnEthPerBlock: snap.burnEthPerBlock,
          lastAt: Date.now(),
          source: snap.source,
        },
        boardPulse: pulsed,
        connection: "connected",
      });
    },
    start: (chainId) => {
      refs += 1;
      if (refs === 1 || activeChain !== chainId) {
        teardown();
        refs = 1;
        activeChain = chainId;
        lastPrice = null;
        set({
          chainId,
          connection: "connecting",
          live: empty,
          boardPulse: 0,
        });
        // Tip first so “since tip” isn’t empty while the heavy snapshot loads
        void pollTip(chainId);
        void pollPrice(chainId).then(() => pollSnapshot(chainId));
        snapTimer = setInterval(() => void pollSnapshot(chainId), 15_000);
        tipTimer = setInterval(
          () => void pollTip(chainId),
          chainId === "sol" || chainId === "hype" ? 2_500 : 5_000,
        );
        priceTimer = setInterval(() => void pollPrice(chainId), 60_000);
        clockTimer = setInterval(() => get().tick(), 1_000);
      }
      return () => {
        refs = Math.max(0, refs - 1);
        if (refs === 0) teardown();
      };
    },
  };
});
