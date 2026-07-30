export type PriceRangeId =
  | "1H"
  | "24H"
  | "7D"
  | "30D"
  | "90D"
  | "1Y"
  | "ALL";

export interface PricePoint {
  /** Unix ms */
  t: number;
  price: number;
  volume?: number;
}

export interface OhlcCandle {
  /** Bucket start, Unix ms */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface PriceHistoryStats {
  open: number;
  high: number;
  low: number;
  close: number;
  changeAbs: number;
  changePct: number;
  volumeSum: number | null;
}

export interface PriceHistoryPayload {
  chain: "btc" | "eth" | "sol" | "hype";
  range: PriceRangeId;
  currency: "usd";
  source: string;
  updatedAt: number;
  points: PricePoint[];
  candles: OhlcCandle[];
  stats: PriceHistoryStats | null;
}

export const PRICE_RANGE_ORDER: PriceRangeId[] = [
  "1H",
  "24H",
  "7D",
  "30D",
  "90D",
  "1Y",
  "ALL",
];

export const PRICE_RANGE_META: Record<
  PriceRangeId,
  { label: string; /** CoinGecko days param */ days: string; sliceMs?: number }
> = {
  "1H": { label: "1H", days: "1", sliceMs: 60 * 60 * 1000 },
  "24H": { label: "24H", days: "1" },
  "7D": { label: "7D", days: "7" },
  "30D": { label: "30D", days: "30" },
  "90D": { label: "90D", days: "90" },
  "1Y": { label: "1Y", days: "365" },
  ALL: { label: "ALL", days: "max" },
};

/** Cache TTL by range (seconds). Shorter windows refresh faster. */
export function priceHistoryRevalidate(range: PriceRangeId): number {
  switch (range) {
    case "1H":
      return 60;
    case "24H":
      return 90;
    case "7D":
      return 180;
    case "30D":
      return 300;
    case "90D":
      return 600;
    case "1Y":
      return 900;
    case "ALL":
      return 1800;
  }
}
