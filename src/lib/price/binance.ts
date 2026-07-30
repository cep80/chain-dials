import type { ChainId } from "@/lib/chains/types";
import {
  type OhlcCandle,
  type PriceHistoryPayload,
  type PriceHistoryStats,
  type PricePoint,
  type PriceRangeId,
} from "@/lib/price/types";

const BINANCE_SYMBOL: Record<ChainId, string> = {
  btc: "BTCUSDT",
  eth: "ETHUSDT",
  sol: "SOLUSDT",
  hype: "HYPEUSDT",
};

/** Map our ranges to Binance kline interval + limit. */
function binanceParams(range: PriceRangeId): {
  interval: string;
  limit: number;
} {
  switch (range) {
    case "1H":
      return { interval: "1m", limit: 60 };
    case "24H":
      return { interval: "5m", limit: 288 };
    case "7D":
      return { interval: "1h", limit: 168 };
    case "30D":
      return { interval: "4h", limit: 180 };
    case "90D":
      return { interval: "12h", limit: 180 };
    case "1Y":
      return { interval: "1d", limit: 365 };
    case "ALL":
      return { interval: "1w", limit: 500 };
  }
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

/**
 * Binance public klines. No API key. Good chart fallback when CoinGecko
 * rate-limits the free tier.
 */
export async function fetchBinancePriceHistory(
  chain: ChainId,
  range: PriceRangeId,
  revalidate: number,
): Promise<PriceHistoryPayload> {
  const symbol = BINANCE_SYMBOL[chain];
  const { interval, limit } = binanceParams(range);
  const url = new URL("https://api.binance.com/api/v3/klines");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Binance klines ${res.status}`);

  // [ openTime, open, high, low, close, volume, closeTime, quoteVolume, ... ]
  const rows = (await res.json()) as unknown[];
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error("Binance returned empty klines");
  }

  const candles: OhlcCandle[] = [];
  const points: PricePoint[] = [];

  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const t = Number(row[0]);
    const o = Number(row[1]);
    const h = Number(row[2]);
    const l = Number(row[3]);
    const c = Number(row[4]);
    const volQuote = Number(row[7] ?? row[5]);
    if (![t, o, h, l, c].every(Number.isFinite)) continue;
    candles.push({ t, o, h, l, c });
    points.push({
      t,
      price: c,
      volume: Number.isFinite(volQuote) ? volQuote : undefined,
    });
  }

  if (points.length < 2) throw new Error("Binance klines unusable");

  return {
    chain,
    range,
    currency: "usd",
    source: "binance",
    updatedAt: Date.now(),
    points,
    candles,
    stats: computeStats(points),
  };
}
