import type { MetricId } from "@/types/metrics";
import type { ChainId } from "@/lib/chains/types";
import { DEFAULT_FAVORITES } from "@/lib/metrics";

const LEGACY_KEY = "btc-dash:favorites:v1";

function keyFor(chainId: ChainId = "btc"): string {
  return `btc-dash:favorites:${chainId}:v1`;
}

const CORE_DEFAULTS: Partial<Record<ChainId, MetricId[]>> = {
  eth: ["price_usd", "block_height", "time_since_block", "fee_fastest", "mempool_count"],
  sol: ["price_usd", "block_height", "time_since_block", "fee_fastest", "mempool_count"],
  hype: ["price_usd", "block_height", "time_since_block", "fee_fastest", "mempool_count"],
};

export function defaultFavoritesFor(chainId: ChainId): MetricId[] {
  if (chainId === "btc") return [...DEFAULT_FAVORITES];
  return [...(CORE_DEFAULTS[chainId] ?? DEFAULT_FAVORITES)];
}

export function loadFavorites(chainId: ChainId = "btc"): MetricId[] {
  if (typeof window === "undefined") return defaultFavoritesFor(chainId);
  try {
    const raw = localStorage.getItem(keyFor(chainId));
    if (!raw) {
      // Migrate legacy BTC key once
      if (chainId === "btc") {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy) as unknown;
          if (Array.isArray(parsed)) {
            const ids = parsed.filter((id): id is MetricId => typeof id === "string");
            saveFavorites(ids, "btc");
            return ids;
          }
        }
      }
      return defaultFavoritesFor(chainId);
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultFavoritesFor(chainId);
    return parsed.filter((id): id is MetricId => typeof id === "string");
  } catch {
    return defaultFavoritesFor(chainId);
  }
}

export function saveFavorites(ids: MetricId[], chainId: ChainId = "btc") {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyFor(chainId), JSON.stringify(ids));
}
