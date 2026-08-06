import { NextRequest, NextResponse } from "next/server";
import { buildWatchboard } from "@/lib/forensics/watch";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = rateLimit(`proxy:forensics:watch:${clientIp(req)}`, 30, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "48");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(80, Math.max(8, Math.floor(limitRaw)))
    : 48;

  try {
    const data = await buildWatchboard(limit);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("forensics watch error", err);
    return NextResponse.json(
      { error: "Failed to refresh watchboard" },
      { status: 502 },
    );
  }
}
