import type { ChainId } from "@/lib/chains/types";
import type {
  CrossVenueArbitrage,
  PredictionMarketCrosscheck,
  PredictionMarketParityGap,
  RuleMismatch,
} from "@/lib/prediction-markets/types";

const CACHE_MS = 60 * 1000;
const MAX_POLYMARKET_BOOKS = 16;
const MIN_GROSS_EDGE = 0.01;

const POLYMARKET_QUERY: Record<ChainId, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  hype: "hyperliquid",
};

const KALSHI_SERIES: Partial<Record<ChainId, string>> = {
  btc: "KXBTC",
  eth: "KXETH",
  sol: "KXSOL",
};

type CacheEntry = {
  expires: number;
  payload: PredictionMarketCrosscheck;
};

type PolymarketRawMarket = {
  active?: boolean;
  closed?: boolean;
  question?: string;
  slug?: string;
  description?: string;
  endDate?: string;
  volume?: string | number;
  clobTokenIds?: string;
};

type PolymarketRawEvent = {
  slug?: string;
  title?: string;
  description?: string;
  markets?: PolymarketRawMarket[];
};

type PolymarketBook = {
  asks?: { price?: string; size?: string }[];
};

type KalshiRawMarket = {
  ticker?: string;
  event_ticker?: string;
  title?: string;
  yes_sub_title?: string;
  close_time?: string;
  rules_primary?: string;
  rules_secondary?: string;
  strike_type?: string;
  floor_strike?: number;
  cap_strike?: number;
  yes_ask_dollars?: string;
  no_ask_dollars?: string;
  yes_ask_size_fp?: string;
  no_ask_size_fp?: string;
};

interface NormalizedPolymarket {
  title: string;
  url: string;
  closesAt: number;
  settlement: string;
  condition: "above" | "below" | "other";
  strike: number | null;
  yesAsk: number | null;
  noAsk: number | null;
  yesSize: number | null;
  noSize: number | null;
}

interface NormalizedKalshi {
  title: string;
  url: string;
  closesAt: number;
  settlement: string;
  condition: "above" | "below" | "range" | "other";
  strike: number | null;
  yesAsk: number | null;
  noAsk: number | null;
  yesSize: number | null;
  noSize: number | null;
}

const memoryCache = new Map<ChainId, CacheEntry>();
const inflight = new Map<ChainId, Promise<PredictionMarketCrosscheck>>();

function numeric(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestamp(value: string | undefined) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function bestAsk(
  levels: { price?: string; size?: string }[] | undefined,
) {
  if (!levels?.length) return { price: null, size: null };

  let price: number | null = null;
  let size: number | null = null;
  for (const level of levels) {
    const levelPrice = numeric(level.price);
    if (levelPrice == null || (price != null && levelPrice >= price)) continue;
    price = levelPrice;
    size = numeric(level.size);
  }
  return { price, size };
}

function settlementReference(text: string) {
  const source = text.toLowerCase();
  if (source.includes("cf benchmarks")) return "CF Benchmarks real-time index";
  if (source.includes("binance")) return "Binance BTC/USDT candle";
  if (source.includes("coinbase")) return "Coinbase price";
  return "venue-specific resolution rule";
}

function conditionFromQuestion(question: string) {
  const text = question.toLowerCase();
  if (text.includes("above") || text.includes("higher than")) return "above" as const;
  if (text.includes("below") || text.includes("lower than")) return "below" as const;
  return "other" as const;
}

function strikeFromQuestion(question: string) {
  const match = question.match(/\$([\d,.]+)/);
  if (!match) return null;
  const value = Number(match[1]!.replaceAll(",", ""));
  return Number.isFinite(value) ? value : null;
}

function minContracts(...sizes: (number | null)[]) {
  const available = sizes.filter((size): size is number => size != null && size > 0);
  return available.length ? Math.min(...available) : null;
}

async function fetchPolymarket(chain: ChainId): Promise<NormalizedPolymarket[]> {
  const query = new URL("https://gamma-api.polymarket.com/public-search");
  query.searchParams.set("q", POLYMARKET_QUERY[chain]);
  const response = await fetch(query, { next: { revalidate: 45 } });
  if (!response.ok) throw new Error(`Polymarket search ${response.status}`);

  const raw = (await response.json()) as { events?: PolymarketRawEvent[] };
  const candidates: {
    market: PolymarketRawMarket;
    title: string;
    eventSlug: string;
  }[] = [];

  for (const event of raw.events ?? []) {
    const eventSlug = event.slug ?? "";
    for (const market of event.markets ?? []) {
      if (!market.active || market.closed || !market.question || !market.clobTokenIds) continue;
      candidates.push({
        market,
        title: market.question,
        eventSlug,
      });
    }
  }

  const top = candidates
    .sort((a, b) => (numeric(b.market.volume) ?? 0) - (numeric(a.market.volume) ?? 0))
    .slice(0, MAX_POLYMARKET_BOOKS);

  return Promise.all(
    top.map(async ({ market, title, eventSlug }) => {
      let tokenIds: string[] = [];
      try {
        const parsed = JSON.parse(market.clobTokenIds ?? "[]") as unknown;
        tokenIds = Array.isArray(parsed)
          ? parsed.filter((token): token is string => typeof token === "string")
          : [];
      } catch {
        tokenIds = [];
      }
      const [yesToken, noToken] = tokenIds;
      const [yesBook, noBook] = await Promise.all([
        yesToken
          ? fetch(`https://clob.polymarket.com/book?token_id=${yesToken}`, {
              next: { revalidate: 20 },
            })
          : Promise.resolve(null),
        noToken
          ? fetch(`https://clob.polymarket.com/book?token_id=${noToken}`, {
              next: { revalidate: 20 },
            })
          : Promise.resolve(null),
      ]);
      const yesData = yesBook?.ok
        ? ((await yesBook.json()) as PolymarketBook)
        : null;
      const noData = noBook?.ok
        ? ((await noBook.json()) as PolymarketBook)
        : null;
      const yes = bestAsk(yesData?.asks);
      const no = bestAsk(noData?.asks);
      const rule = market.description ?? "";
      const slug = market.slug ?? eventSlug;

      return {
        title,
        url: `https://polymarket.com/event/${eventSlug}?market=${slug}`,
        closesAt: timestamp(market.endDate) ?? 0,
        settlement: settlementReference(rule),
        condition: conditionFromQuestion(title),
        strike: strikeFromQuestion(title),
        yesAsk: yes.price,
        noAsk: no.price,
        yesSize: yes.size,
        noSize: no.size,
      };
    }),
  );
}

async function fetchKalshi(chain: ChainId): Promise<NormalizedKalshi[]> {
  const series = KALSHI_SERIES[chain];
  if (!series) return [];

  const url = new URL("https://external-api.kalshi.com/trade-api/v2/markets");
  url.searchParams.set("status", "open");
  url.searchParams.set("series_ticker", series);
  url.searchParams.set("limit", "1000");
  const response = await fetch(url, { next: { revalidate: 45 } });
  if (!response.ok) throw new Error(`Kalshi markets ${response.status}`);

  const raw = (await response.json()) as { markets?: KalshiRawMarket[] };
  const markets = raw.markets ?? [];
  const futureEvents = new Map<string, number>();
  const now = Date.now();
  for (const market of markets) {
    const closesAt = timestamp(market.close_time);
    if (!market.event_ticker || closesAt == null || closesAt < now) continue;
    const existing = futureEvents.get(market.event_ticker);
    if (existing == null || closesAt < existing) {
      futureEvents.set(market.event_ticker, closesAt);
    }
  }
  const nearestEvent = [...futureEvents.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
  if (!nearestEvent) return [];

  return markets
    .filter((market) => market.event_ticker === nearestEvent && market.ticker)
    .map((market) => {
      const rules = `${market.rules_primary ?? ""} ${market.rules_secondary ?? ""}`;
      const condition =
        market.strike_type === "greater"
          ? "above"
          : market.strike_type === "less"
            ? "below"
            : market.strike_type === "between"
              ? "range"
              : "other";
      return {
        title: `${market.title ?? "Kalshi contract"}${market.yes_sub_title ? ` · ${market.yes_sub_title}` : ""}`,
        url: `https://kalshi.com/markets/${market.ticker}`,
        closesAt: timestamp(market.close_time) ?? 0,
        settlement: settlementReference(rules),
        condition,
        strike:
          condition === "above"
            ? market.floor_strike ?? null
            : condition === "below"
              ? market.cap_strike ?? null
              : null,
        yesAsk: numeric(market.yes_ask_dollars),
        noAsk: numeric(market.no_ask_dollars),
        yesSize: numeric(market.yes_ask_size_fp),
        noSize: numeric(market.no_ask_size_fp),
      };
    });
}

function withinVenueGaps(
  venue: "polymarket" | "kalshi",
  markets: (NormalizedPolymarket | NormalizedKalshi)[],
): PredictionMarketParityGap[] {
  return markets.flatMap((market) => {
    if (market.yesAsk == null || market.noAsk == null) return [];
    const grossEdge = 1 - market.yesAsk - market.noAsk;
    if (grossEdge <= MIN_GROSS_EDGE) return [];
    return [
      {
        venue,
        title: market.title,
        url: market.url,
        closesAt: market.closesAt,
        yesAsk: market.yesAsk,
        noAsk: market.noAsk,
        grossEdgePct: grossEdge * 100,
        availableContracts: minContracts(market.yesSize, market.noSize),
      },
    ];
  });
}

function samePayoff(
  polymarket: NormalizedPolymarket,
  kalshi: NormalizedKalshi,
) {
  return (
    polymarket.closesAt > 0 &&
    kalshi.closesAt > 0 &&
    polymarket.settlement === kalshi.settlement &&
    polymarket.condition === kalshi.condition &&
    polymarket.strike != null &&
    polymarket.strike === kalshi.strike &&
    Math.abs(polymarket.closesAt - kalshi.closesAt) <= 60 * 1000
  );
}

function crossVenueGaps(
  polymarket: NormalizedPolymarket[],
  kalshi: NormalizedKalshi[],
) {
  const exactPairs: [NormalizedPolymarket, NormalizedKalshi][] = [];
  const gaps: CrossVenueArbitrage[] = [];

  for (const poly of polymarket) {
    for (const kalshiMarket of kalshi) {
      if (!samePayoff(poly, kalshiMarket)) continue;
      exactPairs.push([poly, kalshiMarket]);
      const combinations: {
        buyPolymarket: "yes" | "no";
        buyKalshi: "yes" | "no";
        polyAsk: number | null;
        kalshiAsk: number | null;
        polySize: number | null;
        kalshiSize: number | null;
      }[] = [
        {
          buyPolymarket: "yes",
          buyKalshi: "no",
          polyAsk: poly.yesAsk,
          kalshiAsk: kalshiMarket.noAsk,
          polySize: poly.yesSize,
          kalshiSize: kalshiMarket.noSize,
        },
        {
          buyPolymarket: "no",
          buyKalshi: "yes",
          polyAsk: poly.noAsk,
          kalshiAsk: kalshiMarket.yesAsk,
          polySize: poly.noSize,
          kalshiSize: kalshiMarket.yesSize,
        },
      ];
      for (const combination of combinations) {
        if (combination.polyAsk == null || combination.kalshiAsk == null) continue;
        const combinedAsk = combination.polyAsk + combination.kalshiAsk;
        const grossEdge = 1 - combinedAsk;
        if (grossEdge <= MIN_GROSS_EDGE) continue;
        gaps.push({
          title: poly.title,
          closesAt: poly.closesAt,
          polymarketUrl: poly.url,
          kalshiUrl: kalshiMarket.url,
          buyPolymarket: combination.buyPolymarket,
          buyKalshi: combination.buyKalshi,
          combinedAsk,
          grossEdgePct: grossEdge * 100,
          availableContracts: minContracts(
            combination.polySize,
            combination.kalshiSize,
          ),
        });
      }
    }
  }
  return { exactPairCount: exactPairs.length, gaps };
}

function ruleMismatches(
  polymarket: NormalizedPolymarket[],
  kalshi: NormalizedKalshi[],
): RuleMismatch[] {
  const poly = polymarket[0] ?? null;
  const kalshiMarket = kalshi[0] ?? null;
  if (!poly && !kalshiMarket) return [];

  const reasons: string[] = [];
  if (!poly) reasons.push("No current Polymarket price contract found.");
  if (!kalshiMarket) reasons.push("No current Kalshi price contract found.");
  if (poly && kalshiMarket) {
    if (poly.settlement !== kalshiMarket.settlement) {
      reasons.push("Different settlement benchmark.");
    }
    if (Math.abs(poly.closesAt - kalshiMarket.closesAt) > 60 * 1000) {
      reasons.push("Different settlement time.");
    }
    if (poly.condition !== kalshiMarket.condition) {
      reasons.push("Different payoff condition.");
    }
    if (poly.strike !== kalshiMarket.strike) {
      reasons.push("Different price threshold or range.");
    }
  }

  return [
    {
      polymarket: poly && {
        title: poly.title,
        url: poly.url,
        closesAt: poly.closesAt,
        settlement: poly.settlement,
      },
      kalshi: kalshiMarket && {
        title: kalshiMarket.title,
        url: kalshiMarket.url,
        closesAt: kalshiMarket.closesAt,
        settlement: kalshiMarket.settlement,
      },
      reasons,
    },
  ];
}

async function loadCrosscheck(chain: ChainId): Promise<PredictionMarketCrosscheck> {
  const [polymarket, kalshi] = await Promise.all([
    fetchPolymarket(chain),
    fetchKalshi(chain),
  ]);
  const crossVenue = crossVenueGaps(polymarket, kalshi);

  return {
    chain,
    asOf: Date.now(),
    exactPairCount: crossVenue.exactPairCount,
    venues: {
      polymarket: true,
      kalshi: Boolean(KALSHI_SERIES[chain]),
    },
    crossVenue: crossVenue.gaps,
    withinVenue: [
      ...withinVenueGaps("polymarket", polymarket),
      ...withinVenueGaps("kalshi", kalshi),
    ].sort((a, b) => b.grossEdgePct - a.grossEdgePct),
    ruleMismatches: ruleMismatches(polymarket, kalshi),
  };
}

/** Read-only public-book comparison. All gaps are gross of venue fees and transfers. */
export async function fetchPredictionMarketCrosscheck(chain: ChainId) {
  const cached = memoryCache.get(chain);
  if (cached && cached.expires > Date.now()) return cached.payload;

  const pending = inflight.get(chain);
  if (pending) return pending;

  const request = loadCrosscheck(chain)
    .then((payload) => {
      memoryCache.set(chain, { payload, expires: Date.now() + CACHE_MS });
      return payload;
    })
    .finally(() => inflight.delete(chain));
  inflight.set(chain, request);
  return request;
}
