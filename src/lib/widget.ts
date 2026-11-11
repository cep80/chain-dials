import { fetchTip, type TipSnapshot } from "@/lib/chains/fetch";
import { fetchPriceHistory } from "@/lib/price/fetch-history";
import type { PriceHistoryPayload } from "@/lib/price/types";
import { percentIssued } from "@/lib/bitcoin";
import { normalizeHashrate } from "@/lib/viz-scale";

/**
 * One compact reading for the iOS and Android home-screen widgets.
 *
 * Widgets wake rarely (iOS budgets ~40-70 refreshes a day, Android's floor is
 * 30 minutes), so each wake makes one small request. Every section is
 * optional: a dead upstream blanks one line on the widget, not the widget.
 *
 * Bump WIDGET_VERSION only for breaking shape changes; the native decoders
 * ignore unknown keys, so adding fields is safe.
 */
export const WIDGET_VERSION = 1;

export const HALVING_INTERVAL = 210_000;
/** Points in the sparkline. Enough for a smooth 24h line at widget size. */
export const SPARK_POINTS = 48;

export interface WidgetPayload {
  v: number;
  /** Unix ms when the server assembled this. */
  at: number;
  price: { usd: number; changePct24h: number | null } | null;
  /** Normalized 0..1 closes over 24h, oldest first, with the raw range. */
  spark: { points: number[]; low: number; high: number } | null;
  block: { height: number; timestamp: number | null; hash: string | null } | null;
  fees: { fastest: number; halfHour: number; hour: number; economy: number } | null;
  halving: { blocksLeft: number; progress: number; nextHeight: number; issuedPct: number } | null;
  /** H/s now, and heat 0..1 against the past month's range (same scale as the web forge). */
  hashrate: { current: number; heat: number } | null;
  /** Difficulty epoch: progress 0..100, expected change in percent. */
  retarget: { progress: number; change: number | null; blocksLeft: number | null } | null;
}

interface HashrateRaw {
  currentHashrate?: number;
  hashrates?: { timestamp: number; avgHashrate: number }[];
}

interface DifficultyRaw {
  progressPercent?: number;
  difficultyChange?: number;
  remainingBlocks?: number;
}

interface FeesRaw {
  fastestFee?: number;
  halfHourFee?: number;
  hourFee?: number;
  economyFee?: number;
}

export function halvingFor(height: number): WidgetPayload["halving"] {
  if (!Number.isFinite(height) || height < 0) return null;
  const epoch = Math.floor(height / HALVING_INTERVAL);
  const nextHeight = (epoch + 1) * HALVING_INTERVAL;
  const into = height - epoch * HALVING_INTERVAL;
  return {
    blocksLeft: nextHeight - height,
    progress: into / HALVING_INTERVAL,
    nextHeight,
    issuedPct: round(percentIssued(height), 4),
  };
}

/** Evenly resample to `n` points (always keeping the last) and scale to 0..1. */
export function sparkFrom(prices: number[], n = SPARK_POINTS): WidgetPayload["spark"] {
  const clean = prices.filter((p) => Number.isFinite(p));
  if (clean.length < 2) return null;
  const picked: number[] = [];
  if (clean.length <= n) {
    picked.push(...clean);
  } else {
    const step = (clean.length - 1) / (n - 1);
    for (let i = 0; i < n; i++) picked.push(clean[Math.round(i * step)]!);
  }
  const low = Math.min(...picked);
  const high = Math.max(...picked);
  const span = high - low;
  return {
    points: picked.map((p) => (span > 0 ? round((p - low) / span, 4) : 0.5)),
    low,
    high,
  };
}

function round(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function feesFrom(raw: FeesRaw | null): WidgetPayload["fees"] {
  if (!raw) return null;
  const { fastestFee, halfHourFee, hourFee, economyFee } = raw;
  if ([fastestFee, halfHourFee, hourFee, economyFee].some((x) => typeof x !== "number")) {
    return null;
  }
  return {
    fastest: fastestFee!,
    halfHour: halfHourFee!,
    hour: hourFee!,
    economy: economyFee!,
  };
}

export function hashrateFrom(raw: HashrateRaw | null): WidgetPayload["hashrate"] {
  const current = raw?.currentHashrate;
  if (typeof current !== "number" || !Number.isFinite(current) || current <= 0) return null;
  const history = (raw?.hashrates ?? []).map((h) => ({ v: h.avgHashrate }));
  return { current, heat: round(normalizeHashrate(current, history), 4) };
}

export function retargetFrom(raw: DifficultyRaw | null): WidgetPayload["retarget"] {
  const progress = raw?.progressPercent;
  if (typeof progress !== "number" || !Number.isFinite(progress)) return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    progress: round(progress, 2),
    change: num(raw?.difficultyChange) != null ? round(raw!.difficultyChange!, 2) : null,
    blocksLeft: num(raw?.remainingBlocks),
  };
}

export function assembleWidget(
  parts: {
    history: PriceHistoryPayload | null;
    tip: TipSnapshot | null;
    fees: FeesRaw | null;
    hashrate?: HashrateRaw | null;
    difficulty?: DifficultyRaw | null;
  },
  now = Date.now(),
): WidgetPayload {
  const { history, tip, fees } = parts;
  const last = history?.points[history.points.length - 1]?.price;
  const height = tip?.height ?? null;
  return {
    v: WIDGET_VERSION,
    at: now,
    price:
      typeof last === "number" && Number.isFinite(last)
        ? {
            usd: last,
            changePct24h:
              history?.stats != null ? round(history.stats.changePct, 2) : null,
          }
        : null,
    spark: history ? sparkFrom(history.points.map((p) => p.price)) : null,
    block: height != null ? { height, timestamp: tip?.timestamp ?? null, hash: tip?.hash ?? null } : null,
    fees: feesFrom(fees),
    halving: height != null ? halvingFor(height) : null,
    hashrate: hashrateFrom(parts.hashrate ?? null),
    retarget: retargetFrom(parts.difficulty ?? null),
  };
}

async function fetchFees(): Promise<FeesRaw> {
  const res = await fetch("https://mempool.space/api/v1/fees/recommended", {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`fees ${res.status}`);
  return (await res.json()) as FeesRaw;
}

async function fetchMempool<T>(path: string): Promise<T> {
  const res = await fetch(`https://mempool.space/api${path}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return (await res.json()) as T;
}

export async function loadWidget(): Promise<WidgetPayload> {
  const [history, tip, fees, hashrate, difficulty] = await Promise.allSettled([
    fetchPriceHistory("btc", "24H", 60),
    fetchTip("btc"),
    fetchFees(),
    fetchMempool<HashrateRaw>("/v1/mining/hashrate/1m"),
    fetchMempool<DifficultyRaw>("/v1/difficulty-adjustment"),
  ]);
  const value = <T,>(r: PromiseSettledResult<T>): T | null =>
    r.status === "fulfilled" ? r.value : null;
  return assembleWidget({
    history: value(history),
    tip: value(tip),
    fees: value(fees),
    hashrate: value(hashrate),
    difficulty: value(difficulty),
  });
}
