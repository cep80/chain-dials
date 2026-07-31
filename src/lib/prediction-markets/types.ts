import type { ChainId } from "@/lib/chains/types";

export type PredictionMarketVenue = "polymarket" | "kalshi";

export interface PredictionMarketParityGap {
  venue: PredictionMarketVenue;
  title: string;
  url: string;
  closesAt: number;
  yesAsk: number;
  noAsk: number;
  grossEdgePct: number;
  availableContracts: number | null;
}

export interface CrossVenueArbitrage {
  title: string;
  closesAt: number;
  polymarketUrl: string;
  kalshiUrl: string;
  buyPolymarket: "yes" | "no";
  buyKalshi: "yes" | "no";
  combinedAsk: number;
  grossEdgePct: number;
  availableContracts: number | null;
}

export interface RuleMismatch {
  polymarket: {
    title: string;
    url: string;
    closesAt: number;
    settlement: string;
  } | null;
  kalshi: {
    title: string;
    url: string;
    closesAt: number;
    settlement: string;
  } | null;
  reasons: string[];
}

export interface PredictionMarketCrosscheck {
  chain: ChainId;
  asOf: number;
  exactPairCount: number;
  crossVenue: CrossVenueArbitrage[];
  withinVenue: PredictionMarketParityGap[];
  ruleMismatches: RuleMismatch[];
}
