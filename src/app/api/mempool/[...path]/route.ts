import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const UPSTREAM = "https://mempool.space/api";

const ALLOWED = new Set([
  "v1/prices",
  "mempool",
  "mempool/recent",
  "v1/fees/recommended",
  "v1/fees/mempool-blocks",
  "v1/difficulty-adjustment",
  "v1/mining/hashrate/3d",
  "v1/lightning/statistics/latest",
  "v1/blocks",
  "blocks/tip/height",
  "blocks/tip/hash",
]);

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const limited = rateLimit(`proxy:mempool:${clientIp(req)}`, 120, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const { path } = await ctx.params;
  const joined = path.join("/");
  if (!ALLOWED.has(joined)) {
    return NextResponse.json({ error: "path not allowed" }, { status: 400 });
  }

  try {
    const res = await fetch(`${UPSTREAM}/${joined}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      next: { revalidate: 0 },
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    console.error("mempool proxy error", err);
    return NextResponse.json({ error: "upstream failed" }, { status: 502 });
  }
}
