/**
 * Retry-and-serve-stale wrapper for upstream chain feeds.
 *
 * The dials read public RPCs and vendor APIs that fail occasionally for no
 * lasting reason. Without this, one blink upstream became a 502 and an empty
 * dial. A single retry absorbs most of them; a short stale window covers the
 * rest, which matters more than freshness when the alternative is nothing.
 *
 * The cache is per serverless instance and therefore best-effort — it is a
 * cushion, not a store.
 */

type Entry = { value: unknown; at: number };

const cache = new Map<string, Entry>();

export type Fresh<T> = { data: T; stale: boolean; ageMs: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetryAndStale<T>(
  key: string,
  load: () => Promise<T>,
  opts: { retries?: number; retryDelayMs?: number; maxStaleMs?: number } = {},
): Promise<Fresh<T>> {
  const retries = opts.retries ?? 1;
  const retryDelayMs = opts.retryDelayMs ?? 150;
  const maxStaleMs = opts.maxStaleMs ?? 60_000;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await load();
      cache.set(key, { value: data, at: Date.now() });
      return { data, stale: false, ageMs: 0 };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(retryDelayMs);
    }
  }

  const cached = cache.get(key);
  if (cached) {
    const ageMs = Date.now() - cached.at;
    if (ageMs <= maxStaleMs) {
      return { data: cached.value as T, stale: true, ageMs };
    }
    cache.delete(key);
  }
  throw lastErr;
}

/** Cache headers that say plainly whether the payload is fresh. */
export function freshnessHeaders(r: Fresh<unknown>): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    "x-feed-stale": r.stale ? "1" : "0",
    "x-feed-age-ms": String(r.ageMs),
  };
}
