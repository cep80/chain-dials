type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Best-effort in-memory limiter (per isolate). Better than unbounded. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 1, resetAt: now + windowMs };
    buckets.set(key, b);
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xf) return xf.slice(0, 128);
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return "unknown";
}

export function rateLimitResponse(retryAfterSec: number): Response {
  return new Response(JSON.stringify({ error: "Too many requests" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSec),
    },
  });
}
