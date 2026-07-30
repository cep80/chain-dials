import { CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import { fetchBinancePriceHistory } from "@/lib/price/binance";
import { fetchCoinbasePriceHistory } from "@/lib/price/coinbase";
import {
  PRICE_RANGE_META,
  type OhlcCandle,
  type PriceHistoryPayload,
  type PriceHistoryStats,
  type PricePoint,
  type PriceRangeId,
} from "@/lib/price/types";

type CacheEntry = {
  expires: number;
  payload: PriceHistoryPayload;
};

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PriceHistoryPayload>>();

function cacheKey(chain: ChainId, range: PriceRangeId) {
  return `${chain}:${range}`;
}

function computeStats(points: PricePoint[]): PriceHistoryStats | null {
  if (points.length < 2) return null;
  const open = points[0]!.price;
  const close = points[points.length - 1]!.price;
  let high = open;
  let low = open;
  let volumeSum = 0;
  let hasVolume = false;
  for (const p of points) {
    if (p.price > high) high = p.price;
    if (p.price < low) low = p.price;
    if (typeof p.volume === "number" && Number.isFinite(p.volume)) {
      volumeSum += p.volume;
      hasVolume = true;
    }
  }
  return {
    open,
    high,
    low,
    close,
    changeAbs: close - open,
    changePct: open !== 0 ? ((close - open) / open) * 100 : 0,
    volumeSum: hasVolume ? volumeSum : null,
  };
}

function sliceByMs(points: PricePoint[], sliceMs: number): PricePoint[] {
  if (!points.length) return points;
  const end = points[points.length - 1]!.t;
  const start = end - sliceMs;
  const sliced = points.filter((p) => p.t >= start);
  return sliced.length >= 2 ? sliced : points.slice(-Math.min(points.length, 12));
}

function downsample(points: PricePoint[], maxPoints: number): PricePoint[] {
  if (points.length <= maxPoints) return points;
  const out: PricePoint[] = [];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    out.push(points[Math.round(i * step)]!);
  }
  out[out.length - 1] = points[points.length - 1]!;
  return out;
}

async function geckoHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = { accept: "application/json" };
  const demo = process.env.COINGECKO_DEMO_API_KEY?.trim();
  const pro = process.env.COINGECKO_API_KEY?.trim();
  if (pro) headers["x-cg-pro-api-key"] = pro;
  else if (demo) headers["x-cg-demo-api-key"] = demo;
  return headers;
}

async function fetchCoinGeckoMarketChart(
  coinId: string,
  days: string,
  revalidate: number,
): Promise<{ prices: [number, number][]; volumes: [number, number][] }> {
  const url = new URL(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
  );
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("days", days);

  const res = await fetch(url.toString(), {
    headers: await geckoHeaders(),
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`CoinGecko market_chart ${res.status}`);
  }
  const data = (await res.json()) as {
    prices?: [number, number][];
    total_volumes?: [number, number][];
  };
  return {
    prices: data.prices ?? [],
    volumes: data.total_volumes ?? [],
  };
}

async function fetchCoinGeckoOhlc(
  coinId: string,
  days: string,
  revalidate: number,
): Promise<OhlcCandle[]> {
  const allowed = new Set(["1", "7", "14", "30", "90", "180", "365", "max"]);
  const daysParam = allowed.has(days) ? days : "30";

  const url = new URL(`https://api.coingecko.com/api/v3/coins/${coinId}/ohlc`);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("days", daysParam);

  const res = await fetch(url.toString(), {
    headers: await geckoHeaders(),
    next: { revalidate },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as [number, number, number, number, number][];
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => Array.isArray(r) && r.length >= 5)
    .map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
}

async function fetchFromCoinGecko(
  chain: ChainId,
  range: PriceRangeId,
  revalidate: number,
): Promise<PriceHistoryPayload> {
  const meta = PRICE_RANGE_META[range];
  const coinId = CHAINS[chain].coingeckoId;

  const chart = await fetchCoinGeckoMarketChart(coinId, meta.days, revalidate);
  // Sequential OHLC to reduce free-tier bursts
  const candlesRaw =
    range === "1H"
      ? []
      : await fetchCoinGeckoOhlc(coinId, meta.days, revalidate);

  const volByT = new Map<number, number>();
  for (const [t, v] of chart.volumes) {
    if (Number.isFinite(t) && Number.isFinite(v)) volByT.set(t, v);
  }

  let points: PricePoint[] = chart.prices
    .filter(([t, p]) => Number.isFinite(t) && Number.isFinite(p) && p > 0)
    .map(([t, price]) => ({
      t,
      price,
      volume: volByT.get(t),
    }));

  if (meta.sliceMs) points = sliceByMs(points, meta.sliceMs);

  const maxPts =
    range === "ALL" || range === "1Y" ? 400 : range === "90D" ? 360 : 320;
  points = downsample(points, maxPts);

  let candles = candlesRaw;
  if (meta.sliceMs && candles.length) {
    const end = candles[candles.length - 1]!.t;
    const start = end - meta.sliceMs;
    candles = candles.filter((c) => c.t >= start);
  }
  if (candles.length > 180) {
    const step = Math.ceil(candles.length / 180);
    candles = candles.filter(
      (_, i) => i % step === 0 || i === candles.length - 1,
    );
  }

  if (points.length < 2) throw new Error("CoinGecko returned too few points");

  return {
    chain,
    range,
    currency: "usd",
    source: "coingecko",
    updatedAt: Date.now(),
    points,
    candles,
    stats: computeStats(points),
  };
}

async function loadFresh(
  chain: ChainId,
  range: PriceRangeId,
  revalidate: number,
): Promise<PriceHistoryPayload> {
  const errors: string[] = [];

  try {
    return await fetchCoinbasePriceHistory(chain, range, revalidate);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "coinbase failed");
  }

  try {
    return await fetchFromCoinGecko(chain, range, revalidate);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "coingecko failed");
  }

  try {
    return await fetchBinancePriceHistory(chain, range, revalidate);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "binance failed");
  }

  throw new Error(errors.join(" · ") || "price history fetch failed");
}

/**
 * Cached price history with request coalescing and Binance fallback.
 */
export async function fetchPriceHistory(
  chain: ChainId,
  range: PriceRangeId,
  revalidate: number,
): Promise<PriceHistoryPayload> {
  const key = cacheKey(chain, range);
  const now = Date.now();
  const hit = memoryCache.get(key);
  if (hit && hit.expires > now) {
    return hit.payload;
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    try {
      let payload = await loadFresh(chain, range, revalidate);
      // Cap payload for UI smoothness (ALL can be 1k+ candles)
      if (payload.points.length > 420) {
        payload = {
          ...payload,
          points: downsample(payload.points, 400),
        };
      }
      if (payload.candles.length > 220) {
        const step = Math.ceil(payload.candles.length / 200);
        payload = {
          ...payload,
          candles: payload.candles.filter(
            (_, i) =>
              i % step === 0 || i === payload.candles.length - 1,
          ),
        };
      }
      memoryCache.set(key, {
        expires: Date.now() + Math.max(revalidate, 60) * 1000,
        payload,
      });
      return payload;
    } catch (e) {
      if (hit) return hit.payload;
      throw e;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

export function isPriceRangeId(v: string): v is PriceRangeId {
  return v in PRICE_RANGE_META;
}
