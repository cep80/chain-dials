import { jsonResource } from "@/lib/data/resource";
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
  lastTipAt: number | null;
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
  lastTipAt: null,
  source: null,
};

export const useAltChainStore = create<AltChainState>((set, get) => {
  let subscriptions: Array<() => void> = [];
  let clockTimer: ReturnType<typeof setInterval> | null = null;
  let refs = 0;
  let activeChain: ChainId | null = null;

  function teardown() {
    subscriptions.forEach((stop) => stop());
    subscriptions = [];
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = null;
    activeChain = null;
  }

  function connect(chainId: ChainId) {
    const tipMs = chainId === "sol" || chainId === "hype" ? 2500 : 5000;
    const tip = jsonResource<TipSnapshot>(`/api/suite/tip/${chainId}`, { staleMs: tipMs, pollMs: tipMs });
    const snapshot = jsonResource<ChainSnapshot>(`/api/suite/snapshot/${chainId}`, { staleMs: 15_000, pollMs: 15_000 });
    const prices = jsonResource<Partial<Record<ChainId, number>>>("/api/suite/prices", { staleMs: 60_000, pollMs: 60_000 });
    let previousTip: TipSnapshot | null = null;
    let previousSnapshot: ChainSnapshot | null = null;
    let previousPrices: Partial<Record<ChainId, number>> | null = null;
    const syncTip = () => {
      if (activeChain !== chainId) return;
      const state = tip.getSnapshot();
      if (state.data && state.data !== previousTip) {
        previousTip = state.data;
        get().applyTip(state.data);
        set({ live: { ...get().live, lastTipAt: state.updatedAt } });
      }
    };
    const syncSnapshot = () => {
      if (activeChain !== chainId) return;
      const state = snapshot.getSnapshot();
      if (state.data && state.data !== previousSnapshot) {
        previousSnapshot = state.data;
        get().applySnapshot(state.data, prices.getSnapshot().data?.[chainId] ?? null);
        set({ live: { ...get().live, lastAt: state.updatedAt } });
      }
      set({ connection: state.error ? (state.data ? "degraded" : "disconnected") : state.data ? "connected" : "connecting" });
    };
    const syncPrices = () => {
      if (activeChain !== chainId) return;
      const state = prices.getSnapshot();
      if (state.data && state.data !== previousPrices) {
        previousPrices = state.data;
        const value = state.data[chainId];
        if (value != null && Number.isFinite(value)) set({ live: { ...get().live, priceUsd: value } });
      }
    };
    subscriptions = [tip.subscribe(syncTip), snapshot.subscribe(syncSnapshot), prices.subscribe(syncPrices)];
    syncTip(); syncSnapshot(); syncPrices();
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
          // and we already have a timestamp (keeps “since block” from resetting).
          tipTimestamp:
            same && get().live.tipTimestamp != null
              ? get().live.tipTimestamp
              : (tip.timestamp ?? get().live.tipTimestamp ?? Date.now()),
          lastTipAt: Date.now(),
          source: tip.source
            ? `${get().live.source?.split("+")[0] ?? tip.source}+tip`
            : get().live.source,
        },
        boardPulse: advanced ? get().boardPulse + 1 : get().boardPulse,
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
      const olderThanTip = height != null && prev != null && height < prev;
      const snapPrice =
        typeof (snap as { priceUsd?: number }).priceUsd === "number"
          ? (snap as { priceUsd?: number }).priceUsd!
          : null;
      set({
        live: {
          ...get().live,
          priceUsd: priceUsd ?? snapPrice ?? get().live.priceUsd,
          blockHeight: olderThanTip ? prev : height,
          tipHash: olderThanTip ? get().live.tipHash : snap.tip.hash,
          tipTimestamp:
            (sameHeight || olderThanTip) && get().live.tipTimestamp != null
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
        set({
          chainId,
          connection: "connecting",
          live: empty,
          boardPulse: 0,
        });
        connect(chainId);
        clockTimer = setInterval(() => { if (document.visibilityState !== "hidden") get().tick(); }, 1000);
      }
      return () => {
        if (activeChain !== chainId) return;
        refs = Math.max(0, refs - 1);
        if (refs === 0) teardown();
      };
    },
  };
});
