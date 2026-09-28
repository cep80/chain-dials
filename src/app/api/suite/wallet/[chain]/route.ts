import { NextRequest, NextResponse } from "next/server";
import { isChainId } from "@/lib/chains/registry";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { lookupWallet } from "@/lib/wallet/lookup";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ chain: string }> },
) {
  const limited = rateLimit(`proxy:wallet:${clientIp(req)}`, 40, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const { chain } = await ctx.params;
  if (!isChainId(chain)) {
    return NextResponse.json({ error: "unknown chain" }, { status: 404 });
  }

  const query = req.nextUrl.searchParams.get("address") ?? "";
  const body = await lookupWallet(chain, query);
  const status = body.reason === "upstream" ? 502 : 200;
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
