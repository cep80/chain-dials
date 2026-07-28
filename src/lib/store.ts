import { create } from "zustand";
import {
  blocksToHalving,
  estimateHalvingDate,
  halvingProgressPercent,
  issuedSupplyBtc,
  percentIssued,
  subsidyEpoch,
} from "@/lib/bitcoin";
import { loadFavorites, saveFavorites } from "@/lib/favorites";
import { DEFAULT_FAVORITES } from "@/lib/metrics";
import { mempoolRest } from "@/lib/mempool-rest";
import { MempoolWs } from "@/lib/mempool-ws";
import {
  formatBtc,
  formatCompactUsd,
  formatDate,
  formatDifficulty,
  formatDuration,
  formatFee,
  formatHash,
  formatHashrate,
  formatInteger,
  formatPercent,
  formatPlainPercent,
  formatSats,
  formatUsd,
  formatVsize,
  satsPerDollar,
} from "@/lib/format";
import type {
  AtmosphereTx,
  BlockToast,
  ConnectionStatus,
  HistoryPoint,
  LiveSnapshot,
  MetricId,
} from "@/types/metrics";

const HISTORY_MAX = 64;
const HISTORY_KEY = "btc-dash:history:v1";
const ONE_DAY = 24 * 60 * 60 * 1000;

type Histories = Partial<Record<MetricId, HistoryPoint[]>>;

function pruneHistory(h: Histories): Histories {
  const cutoff = Date.now() - ONE_DAY;
  const next: Histories = {};
  for (const [k, points] of Object.entries(h)) {
    const kept = (points ?? []).filter((p) => p.t >= cutoff).slice(-HISTORY_MAX);
    if (kept.length) next[k as MetricId] = kept;
  }
  return next;
}

function loadHistory(): Histories {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return {};
    return pruneHistory(JSON.parse(raw) as Histories);
  } catch {
    return {};
  }
}

function persistHistory(h: Histories) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(pruneHistory(h)));
  } catch {
    // quota
  }
}

function pushPoint(histories: Histories, id: MetricId, value: number | null): Histories {
  if (value == null || !Number.isFinite(value)) return histories;
  const prev = histories[id] ?? [];
  const last = prev[prev.length - 1];
  // Throttle identical samples
  if (last && Math.abs(last.v - value) < Number.EPSILON && Date.now() - last.t < 5_000) {
    return histories;
  }
  const next = [...prev, { t: Date.now(), v: value }].slice(-HISTORY_MAX);
  return { ...histories, [id]: next };
}

export interface DashboardState {
  hydrated: boolean;
  connection: ConnectionStatus;
  favorites: MetricId[];
  expandedId: MetricId | null;
  histories: Histories;
  flash: Partial<Record<MetricId, "up" | "down">>;
  blockToast: BlockToast | null;
  boardPulse: number;
  now: number;
  live: LiveSnapshot;
  hydrate: () => void;
  setExpanded: (id: MetricId | null) => void;
  toggleFavorite: (id: MetricId) => void;
  pinDefaults: () => void;
  clearToast: () => void;
  tick: () => void;
  start: () => () => void;
}

const emptyLive: LiveSnapshot = {
  priceUsd: null,
  blockHeight: null,
  tipHash: null,
  tipTimestamp: null,
  mempoolCount: null,
  mempoolVsize: null,
  mempoolTotalFee: null,
  feeFastest: null,
  feeHalfHour: null,
  feeHour: null,
  feeEconomy: null,
  feeMinimum: null,
  hashrate: null,
  difficulty: null,
  retargetProgress: null,
  retargetChange: null,
  retargetBlocks: null,
  retargetDate: null,
  lnCapacitySats: null,
  lnNodes: null,
  lnChannels: null,
  lnUpdatedAt: null,
  recentTxs: [],
  feeHistogram: [],
  mempoolBlocks: [],
  lastRestAt: null,
  lastWsAt: null,
};

const RECENT_TX_CAP = 64;

let wsClient: MempoolWs | null = null;
let restTimer: ReturnType<typeof setInterval> | null = null;
let recentTimer: ReturnType<typeof setInterval> | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let historyPersistTimer: ReturnType<typeof setTimeout> | null = null;
let startCount = 0;

function mergeRecentTxs(
  prev: AtmosphereTx[],
  incoming: { txid: string; fee: number; vsize: number; value: number }[],
): AtmosphereTx[] {
  const now = Date.now();
  const byId = new Map(prev.map((t) => [t.txid, t]));
  const incomingIds = new Set<string>();
  const merged: AtmosphereTx[] = [];

  // Keep existing particles stable — update in previous order first
  for (const old of prev) {
    const raw = incoming.find((t) => t.txid === old.txid);
    if (raw && raw.vsize) {
      incomingIds.add(raw.txid);
      merged.push({
        ...old,
        fee: raw.fee,
        vsize: raw.vsize,
        value: raw.value,
        feeRate: raw.fee / raw.vsize,
        fresh: false,
      });
    } else if (now - old.seenAt < 60_000) {
      // Hold departed txs longer so the canvas can fade them out
      merged.push({ ...old, fresh: false });
    }
  }

  for (const raw of incoming) {
    if (!raw.txid || !raw.vsize || incomingIds.has(raw.txid)) continue;
    if (byId.has(raw.txid)) continue;
    incomingIds.add(raw.txid);
    merged.push({
      txid: raw.txid,
      fee: raw.fee,
      vsize: raw.vsize,
      value: raw.value,
      feeRate: raw.fee / raw.vsize,
      seenAt: now,
      fresh: true,
    });
  }

  return merged.slice(0, RECENT_TX_CAP);
}

function teardown() {
  wsClient?.disconnect();
  wsClient = null;
  if (restTimer) clearInterval(restTimer);
  if (recentTimer) clearInterval(recentTimer);
  if (tickTimer) clearInterval(tickTimer);
  restTimer = null;
  recentTimer = null;
  tickTimer = null;
}

function scheduleHistoryPersist(get: () => DashboardState) {
  if (historyPersistTimer) clearTimeout(historyPersistTimer);
  historyPersistTimer = setTimeout(() => persistHistory(get().histories), 2000);
}

function applyNumeric(
  set: (fn: (s: DashboardState) => Partial<DashboardState> | DashboardState) => void,
  get: () => DashboardState,
  id: MetricId,
  value: number | null,
  patchLive?: Partial<LiveSnapshot>,
) {
  const prevHist = get().histories[id];
  const prevVal = prevHist?.[prevHist.length - 1]?.v;
  let flash: "up" | "down" | undefined;
  if (prevVal != null && value != null && value !== prevVal) {
    flash = value > prevVal ? "up" : "down";
  }

  set((s) => ({
    live: patchLive ? { ...s.live, ...patchLive } : s.live,
    histories: pushPoint(s.histories, id, value),
    flash: flash ? { ...s.flash, [id]: flash } : s.flash,
  }));
  scheduleHistoryPersist(get);

  if (flash) {
    setTimeout(() => {
      set((s) => {
        const next = { ...s.flash };
        delete next[id];
        return { flash: next };
      });
    }, 700);
  }
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  hydrated: false,
  connection: "disconnected" as ConnectionStatus,
  favorites: [...DEFAULT_FAVORITES],
  expandedId: null,
  histories: {},
  flash: {},
  blockToast: null,
  boardPulse: 0,
  now: Date.now(),
  live: emptyLive,

  hydrate: () => {
    if (get().hydrated) return;
    set({
      hydrated: true,
      favorites: loadFavorites(),
      histories: loadHistory(),
      now: Date.now(),
    });
  },

  setExpanded: (id) => set({ expandedId: id }),

  toggleFavorite: (id) => {
    const current = get().favorites;
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    saveFavorites(next);
    set({ favorites: next });
  },

  pinDefaults: () => {
    saveFavorites([...DEFAULT_FAVORITES]);
    set({ favorites: [...DEFAULT_FAVORITES] });
  },

  clearToast: () => set({ blockToast: null }),

  tick: () => set({ now: Date.now() }),

  start: () => {
    startCount += 1;
    if (startCount > 1) {
      return () => {
        startCount = Math.max(0, startCount - 1);
        if (startCount === 0) teardown();
      };
    }

    get().hydrate();

    const ingestBlock = (height: number, hash?: string, timestamp?: number) => {
      const prev = get().live.blockHeight;
      const tipTimestamp = timestamp
        ? timestamp < 1e12
          ? timestamp * 1000
          : timestamp
        : Date.now();

      applyNumeric(set, get, "block_height", height, {
        blockHeight: height,
        tipHash: hash ?? get().live.tipHash,
        tipTimestamp,
        lastWsAt: Date.now(),
      });

      if (hash) {
        set((s) => ({ live: { ...s.live, tipHash: hash } }));
      }

      // derived
      const supply = issuedSupplyBtc(height);
      const price = get().live.priceUsd;
      applyNumeric(set, get, "halving_epoch", subsidyEpoch(height));
      applyNumeric(set, get, "halving_blocks", blocksToHalving(height));
      applyNumeric(set, get, "halving_progress", halvingProgressPercent(height));
      applyNumeric(set, get, "halving_date", estimateHalvingDate(height));
      applyNumeric(set, get, "money_supply", supply);
      applyNumeric(set, get, "pct_issued", percentIssued(height));
      if (price != null) {
        applyNumeric(set, get, "market_cap", price * supply);
      }

      if (prev != null && height > prev) {
        set({
          boardPulse: get().boardPulse + 1,
          blockToast: {
            id: `${height}-${Date.now()}`,
            height,
            foundAt: Date.now(),
          },
        });
      }
    };

    const ingestMempool = (
      count: number,
      vsize: number,
      totalFee?: number,
      feeHistogram?: [number, number][],
    ) => {
      const pressure = (vsize / 1_000_000) * 100;
      applyNumeric(set, get, "mempool_count", count, {
        mempoolCount: count,
        mempoolVsize: vsize,
        mempoolTotalFee: totalFee ?? get().live.mempoolTotalFee,
        feeHistogram:
          feeHistogram && feeHistogram.length
            ? feeHistogram
            : get().live.feeHistogram,
        lastWsAt: Date.now(),
      });
      applyNumeric(set, get, "mempool_vsize", vsize);
      applyNumeric(set, get, "mempool_pressure", pressure);
    };

    const pollAtmosphere = async () => {
      try {
        const [recent, projections] = await Promise.all([
          mempoolRest.recentTxs(),
          mempoolRest.mempoolBlocks().catch(() => null),
        ]);
        set((s) => {
          const nextTxs = mergeRecentTxs(s.live.recentTxs, recent);
          const prevIds = s.live.recentTxs.map((t) => t.txid).join(",");
          const nextIds = nextTxs.map((t) => t.txid).join(",");
          const txsChanged = prevIds !== nextIds;
          const nextBlocks = projections
            ? projections.slice(0, 8).map((b) => ({
                nTx: b.nTx,
                medianFee: b.medianFee,
                totalFees: b.totalFees,
                blockVSize: b.blockVSize,
                feeRange: b.feeRange ?? [],
              }))
            : s.live.mempoolBlocks;
          if (!txsChanged && projections == null) {
            return s;
          }
          return {
            connection:
              s.connection === "disconnected" || s.connection === "connecting"
                ? s.connection
                : "connected",
            live: {
              ...s.live,
              recentTxs: txsChanged ? nextTxs : s.live.recentTxs,
              mempoolBlocks: nextBlocks,
              lastRestAt: Date.now(),
            },
          };
        });
      } catch (err) {
        console.warn("Atmosphere poll failed", err);
        set((s) => ({
          connection:
            s.connection === "disconnected" ? "disconnected" : "degraded",
        }));
      }
    };

    const pollRest = async () => {
      const results = await Promise.allSettled([
        mempoolRest.prices(),
        mempoolRest.mempool(),
        mempoolRest.fees(),
        mempoolRest.difficulty(),
        mempoolRest.hashrate(),
        mempoolRest.lightning(),
        mempoolRest.recentBlocks(),
      ]);

      const [pricesR, mempoolR, feesR, difficultyR, hashrateR, lightningR, blocksR] =
        results;

      const fulfilled = results.filter((r) => r.status === "fulfilled").length;
      if (fulfilled === 0) {
        console.warn("REST poll failed entirely", results);
        set({
          connection: get().live.lastWsAt ? "degraded" : "disconnected",
        });
        return;
      }
      if (fulfilled < 5) {
        set((s) => ({
          connection: s.connection === "disconnected" ? "disconnected" : "degraded",
        }));
      } else {
        set((s) => ({
          connection:
            s.connection === "disconnected" || s.connection === "connecting"
              ? "connected"
              : s.connection === "degraded"
                ? "connected"
                : s.connection,
        }));
      }

      try {
        if (pricesR.status === "fulfilled") {
          const priceUsd = pricesR.value.USD;
          applyNumeric(set, get, "price_usd", priceUsd, {
            priceUsd,
            lastRestAt: Date.now(),
          });
          applyNumeric(set, get, "sats_per_dollar", satsPerDollar(priceUsd));
        }

        if (mempoolR.status === "fulfilled") {
          const mempool = mempoolR.value;
          ingestMempool(
            mempool.count,
            mempool.vsize,
            mempool.total_fee,
            mempool.fee_histogram,
          );
        }

        if (feesR.status === "fulfilled") {
          const fees = feesR.value;
          applyNumeric(set, get, "fee_fastest", fees.fastestFee, {
            feeFastest: fees.fastestFee,
            feeHalfHour: fees.halfHourFee,
            feeHour: fees.hourFee,
            feeEconomy: fees.economyFee,
            feeMinimum: fees.minimumFee,
          });
          applyNumeric(set, get, "fee_half_hour", fees.halfHourFee);
          applyNumeric(set, get, "fee_hour", fees.hourFee);
          applyNumeric(set, get, "fee_economy", fees.economyFee);
        }

        if (hashrateR.status === "fulfilled") {
          const hashrate = hashrateR.value;
          applyNumeric(set, get, "hashrate", hashrate.currentHashrate, {
            hashrate: hashrate.currentHashrate,
            difficulty: hashrate.currentDifficulty,
          });
          applyNumeric(set, get, "difficulty", hashrate.currentDifficulty);
        }

        if (difficultyR.status === "fulfilled") {
          const difficulty = difficultyR.value;
          applyNumeric(set, get, "retarget_progress", difficulty.progressPercent, {
            retargetProgress: difficulty.progressPercent,
            retargetChange: difficulty.difficultyChange,
            retargetBlocks: difficulty.remainingBlocks,
            retargetDate: difficulty.estimatedRetargetDate,
          });
          applyNumeric(set, get, "retarget_change", difficulty.difficultyChange);
          applyNumeric(set, get, "retarget_blocks", difficulty.remainingBlocks);
        }

        if (lightningR.status === "fulfilled" && lightningR.value?.latest) {
          const ln = lightningR.value.latest;
          const lnAt = Date.parse(ln.added) || Date.now();
          applyNumeric(set, get, "ln_capacity", ln.total_capacity / 1e8, {
            lnCapacitySats: ln.total_capacity,
            lnNodes: ln.node_count,
            lnChannels: ln.channel_count,
            lnUpdatedAt: lnAt,
          });
          applyNumeric(set, get, "ln_nodes", ln.node_count);
          applyNumeric(set, get, "ln_channels", ln.channel_count);
        }

        if (blocksR.status === "fulfilled" && blocksR.value.length > 0) {
          const tip = blocksR.value[0];
          ingestBlock(tip.height, tip.id, tip.timestamp);
        } else if (pricesR.status === "fulfilled") {
          const height = get().live.blockHeight;
          const priceUsd = pricesR.value.USD;
          if (height != null && priceUsd != null) {
            applyNumeric(set, get, "market_cap", priceUsd * issuedSupplyBtc(height));
          }
        }

        const tipTs = get().live.tipTimestamp;
        if (tipTs) {
          applyNumeric(set, get, "time_since_block", (Date.now() - tipTs) / 1000);
        }

        set((s) => ({
          live: { ...s.live, lastRestAt: Date.now() },
        }));
      } catch (err) {
        console.warn("REST apply failed", err);
        set({
          connection: get().live.lastWsAt ? "degraded" : "disconnected",
        });
      }
    };

    wsClient = new MempoolWs(
      (msg) => {
        set((s) => ({
          live: { ...s.live, lastWsAt: Date.now() },
          connection: s.connection === "degraded" ? "connected" : s.connection,
        }));

        if (msg.block) {
          const b = msg.block as {
            height?: number;
            id?: string;
            hash?: string;
            timestamp?: number;
          };
          if (typeof b.height === "number") {
            ingestBlock(b.height, b.id ?? b.hash, b.timestamp);
          }
        }

        // Array of blocks sometimes
        if (Array.isArray(msg.blocks) && msg.blocks.length) {
          const b = msg.blocks[0] as {
            height?: number;
            id?: string;
            timestamp?: number;
          };
          if (typeof b.height === "number") {
            ingestBlock(b.height, b.id, b.timestamp);
          }
        }

        if (msg.mempoolInfo) {
          const m = msg.mempoolInfo as { size?: number; bytes?: number };
          // size = tx count. Prefer not to treat bytes as vsize — REST owns vsize/pressure.
          if (typeof m.size === "number") {
            ingestMempool(
              m.size,
              get().live.mempoolVsize ?? 0,
              get().live.mempoolTotalFee ?? undefined,
            );
          }
        }

        if (msg.fees) {
          const f = msg.fees as Record<string, number>;
          if (f.fastestFee != null) {
            applyNumeric(set, get, "fee_fastest", f.fastestFee, {
              feeFastest: f.fastestFee,
              feeHalfHour: f.halfHourFee ?? get().live.feeHalfHour,
              feeHour: f.hourFee ?? get().live.feeHour,
              feeEconomy: f.economyFee ?? get().live.feeEconomy,
            });
          }
          if (f.halfHourFee != null) applyNumeric(set, get, "fee_half_hour", f.halfHourFee);
          if (f.hourFee != null) applyNumeric(set, get, "fee_hour", f.hourFee);
          if (f.economyFee != null) applyNumeric(set, get, "fee_economy", f.economyFee);
        }
      },
      (status) => {
        if (status === "connected") set({ connection: "connected" });
        else if (status === "connecting") set({ connection: "connecting" });
        else set({ connection: get().live.lastRestAt ? "degraded" : "disconnected" });
      },
    );

    wsClient.connect();
    void pollRest();
    void pollAtmosphere();
    restTimer = setInterval(() => void pollRest(), 45_000);
    recentTimer = setInterval(() => void pollAtmosphere(), 10_000);
    let sinceSample = 0;
    tickTimer = setInterval(() => {
      get().tick();
      sinceSample += 1;
      const tipTs = get().live.tipTimestamp;
      // Sample sparklines every 30s — display uses live `now` every tick
      if (tipTs && sinceSample % 30 === 0) {
        applyNumeric(set, get, "time_since_block", (Date.now() - tipTs) / 1000);
      }
    }, 1000);

    return () => {
      startCount = Math.max(0, startCount - 1);
      if (startCount === 0) teardown();
    };
  },
}));

export function getMetricNumeric(
  live: LiveSnapshot,
  now: number,
  id: MetricId,
): number | null {
  switch (id) {
    case "price_usd":
      return live.priceUsd;
    case "sats_per_dollar":
      return satsPerDollar(live.priceUsd);
    case "market_cap":
      return live.priceUsd != null && live.blockHeight != null
        ? live.priceUsd * issuedSupplyBtc(live.blockHeight)
        : null;
    case "block_height":
      return live.blockHeight;
    case "time_since_block":
      return live.tipTimestamp != null ? (now - live.tipTimestamp) / 1000 : null;
    case "tip_hash":
      return null;
    case "mempool_count":
      return live.mempoolCount;
    case "mempool_vsize":
      return live.mempoolVsize;
    case "mempool_pressure":
      return live.mempoolVsize != null ? (live.mempoolVsize / 1_000_000) * 100 : null;
    case "fee_fastest":
      return live.feeFastest;
    case "fee_half_hour":
      return live.feeHalfHour;
    case "fee_hour":
      return live.feeHour;
    case "fee_economy":
      return live.feeEconomy;
    case "hashrate":
      return live.hashrate;
    case "difficulty":
      return live.difficulty;
    case "retarget_progress":
      return live.retargetProgress;
    case "retarget_change":
      return live.retargetChange;
    case "retarget_blocks":
      return live.retargetBlocks;
    case "halving_epoch":
      return live.blockHeight != null ? subsidyEpoch(live.blockHeight) : null;
    case "halving_blocks":
      return live.blockHeight != null ? blocksToHalving(live.blockHeight) : null;
    case "halving_date":
      return live.blockHeight != null ? estimateHalvingDate(live.blockHeight, now) : null;
    case "halving_progress":
      return live.blockHeight != null ? halvingProgressPercent(live.blockHeight) : null;
    case "ln_capacity":
      return live.lnCapacitySats != null ? live.lnCapacitySats / 1e8 : null;
    case "ln_nodes":
      return live.lnNodes;
    case "ln_channels":
      return live.lnChannels;
    case "money_supply":
      return live.blockHeight != null ? issuedSupplyBtc(live.blockHeight) : null;
    case "pct_issued":
      return live.blockHeight != null ? percentIssued(live.blockHeight) : null;
    default:
      return null;
  }
}

export function getMetricDisplay(
  live: LiveSnapshot,
  now: number,
  id: MetricId,
): string {
  const v = getMetricNumeric(live, now, id);
  switch (id) {
    case "price_usd":
      return formatUsd(v, 0);
    case "sats_per_dollar":
      return formatSats(v);
    case "market_cap":
      return formatCompactUsd(v);
    case "block_height":
    case "mempool_count":
    case "retarget_blocks":
    case "halving_epoch":
    case "halving_blocks":
    case "ln_nodes":
    case "ln_channels":
      return formatInteger(v);
    case "time_since_block":
      return formatDuration(v);
    case "tip_hash":
      return formatHash(live.tipHash);
    case "mempool_vsize":
      return formatVsize(v);
    case "mempool_pressure":
    case "retarget_progress":
    case "halving_progress":
    case "pct_issued":
      return formatPlainPercent(v, 2);
    case "retarget_change":
      return formatPercent(v, 2);
    case "fee_fastest":
    case "fee_half_hour":
    case "fee_hour":
    case "fee_economy":
      return formatFee(v);
    case "hashrate":
      return formatHashrate(v);
    case "difficulty":
      return formatDifficulty(v);
    case "halving_date":
      return formatDate(v);
    case "ln_capacity":
    case "money_supply":
      return formatBtc(v, 2);
    default:
      return "—";
  }
}

export function deltaFor(
  histories: Partial<Record<MetricId, HistoryPoint[]>>,
  id: MetricId,
  current: number | null,
): { pct: number | null; label: string } {
  if (current == null) return { pct: null, label: "" };
  const points = histories[id];
  if (!points || points.length < 2) return { pct: null, label: "" };
  const oldest = points[0];
  const ageH = (Date.now() - oldest.t) / 3_600_000;
  if (oldest.v === 0) return { pct: null, label: "" };
  const pct = ((current - oldest.v) / Math.abs(oldest.v)) * 100;
  const label = ageH >= 20 ? "24h" : "session";
  return { pct, label };
}
