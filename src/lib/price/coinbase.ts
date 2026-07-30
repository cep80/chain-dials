import type { ChainId } from "@/lib/chains/types";
import type {
  OhlcCandle,
  PriceHistoryPayload,
  PriceHistoryStats,
  PricePoint,
  PriceRangeId,
} from "@/lib/price/types";

const PRODUCT: Record<ChainId, string> = {
  btc: "BTC-USD",
  eth: "ETH-USD",
  sol: "SOL-USD",
  hype: "HYPE-USD",
};

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

function rangeWindow(range: PriceRangeId): {
  granularity: number;
  spanMs: number;
} {
  const hour = 3600_000;
  const day = 24 * hour;
  switch (range) {
    case "1H":
      return { granularity: 60, spanMs: hour };
    case "24H":
      return { granularity: 300, spanMs: day };
    case "7D":
      return { granularity: 3600, spanMs: 7 * day };
    case "30D":
      return { granularity: 21600, spanMs: 30 * day };
    case "90D":
      return { granularity: 86400, spanMs: 90 * day };
    case "1Y":
      return { granularity: 86400, spanMs: 365 * day };
    case "ALL":
      return { granularity: 86400, spanMs: 5 * 365 * day };
  }
}

type RawCandle = [number, number, number, number, number, number];

async function fetchPage(
  product: string,
  granularity: number,
  startIso: string,
  endIso: string,
  revalidate: number,
): Promise<RawCandle[]> {
  const url = new URL(
    `https://api.exchange.coinbase.com/products/${product}/candles`,
  );
  url.searchParams.set("granularity", String(granularity));
  url.searchParams.set("start", startIso);
  url.searchParams.set("end", endIso);

  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "User-Agent": "ChainDials/1.0",
    },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Coinbase candles ${res.status}`);
  const rows = (await res.json()) as RawCandle[];
  if (!Array.isArray(rows)) return [];
  return rows;
}

/**
 * Coinbase Exchange public candles (USD). Works where Binance is geo-blocked.
 */
export async function fetchCoinbasePriceHistory(
  chain: ChainId,
  range: PriceRangeId,
  revalidate: number,
): Promise<PriceHistoryPayload> {
  const product = PRODUCT[chain];
  const { granularity, spanMs } = rangeWindow(range);
  const endMs = Date.now();
  const startMs = endMs - spanMs;

  // Coinbase returns max ~300 candles per call; page backwards if needed.
  const maxPerPage = 300;
  const stepMs = granularity * 1000 * maxPerPage;
  const pages: RawCandle[] = [];
  let cursorEnd = endMs;

  while (cursorEnd > startMs && pages.length < 2000) {
    const cursorStart = Math.max(startMs, cursorEnd - stepMs);
    const batch = await fetchPage(
      product,
      granularity,
      new Date(cursorStart).toISOString(),
      new Date(cursorEnd).toISOString(),
      revalidate,
    );
    if (!batch.length) break;
    pages.push(...batch);
    const oldest = Math.min(...batch.map((r) => r[0]!)) * 1000;
    if (oldest <= startMs + granularity * 1000) break;
    // Move window; avoid infinite loop
    if (oldest >= cursorEnd) break;
    cursorEnd = oldest - 1000;
    // One page is enough for short ranges
    if (spanMs / (granularity * 1000) <= maxPerPage) break;
  }

  if (pages.length < 2) throw new Error("Coinbase returned empty candles");

  // Dedupe by open time, sort ascending
  const byT = new Map<number, RawCandle>();
  for (const row of pages) {
    if (!Array.isArray(row) || row.length < 6) continue;
    byT.set(row[0]!, row);
  }
  const sorted = [...byT.values()].sort((a, b) => a[0]! - b[0]!);

  const candles: OhlcCandle[] = [];
  const points: PricePoint[] = [];
  for (const [tSec, low, high, open, close, volume] of sorted) {
    const t = tSec * 1000;
    if (![t, low, high, open, close].every(Number.isFinite)) continue;
    candles.push({ t, o: open, h: high, l: low, c: close });
    points.push({
      t,
      price: close,
      volume: Number.isFinite(volume) ? volume * close : undefined,
    });
  }

  if (points.length < 2) throw new Error("Coinbase candles unusable");

  return {
    chain,
    range,
    currency: "usd",
    source: "coinbase",
    updatedAt: Date.now(),
    points,
    candles,
    stats: computeStats(points),
  };
}
