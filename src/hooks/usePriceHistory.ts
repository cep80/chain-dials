"use client";

import type { ChainId } from "@/lib/chains/types";
import { priceHistoryRevalidate, type PriceHistoryPayload, type PriceRangeId } from "@/lib/price/types";
import { useJsonResource } from "@/hooks/useJsonResource";

export function usePriceHistory(chainId: ChainId, range: PriceRangeId, enabled = true) {
  const staleMs = priceHistoryRevalidate(range) * 1000;
  return useJsonResource<PriceHistoryPayload>(
    enabled ? `/api/suite/price-history?chain=${chainId}&range=${range}` : null,
    { staleMs, pollMs: staleMs },
  );
}
