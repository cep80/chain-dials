import type { MetricId } from "@/types/metrics";
import { DEFAULT_FAVORITES } from "@/lib/metrics";

const KEY = "btc-dash:favorites:v1";

export function loadFavorites(): MetricId[] {
  if (typeof window === "undefined") return [...DEFAULT_FAVORITES];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [...DEFAULT_FAVORITES];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_FAVORITES];
    return parsed.filter((id): id is MetricId => typeof id === "string");
  } catch {
    return [...DEFAULT_FAVORITES];
  }
}

export function saveFavorites(ids: MetricId[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(ids));
}
