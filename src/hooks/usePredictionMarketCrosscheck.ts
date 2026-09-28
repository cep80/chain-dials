"use client";

import { useJsonResource } from "@/hooks/useJsonResource";
import type { ChainId } from "@/lib/chains/types";
import type { PredictionMarketCrosscheck } from "@/lib/prediction-markets/types";

export function usePredictionMarketCrosscheck(chain: ChainId) {
  return useJsonResource<PredictionMarketCrosscheck>(`/api/suite/prediction-markets/${chain}`, { staleMs: 60_000, pollMs: 60_000 });
}
