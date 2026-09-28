export type Freshness = "loading" | "live" | "stale" | "unavailable";

export function readingFreshness({ updatedAt, loading = false, error = null, now = Date.now(), staleMs }: {
  updatedAt: number | null;
  loading?: boolean;
  error?: string | null;
  now?: number;
  staleMs: number;
}): Freshness {
  if (updatedAt == null || !Number.isFinite(updatedAt)) return loading ? "loading" : "unavailable";
  return error || now - updatedAt >= staleMs || updatedAt > now + 60_000 ? "stale" : "live";
}
