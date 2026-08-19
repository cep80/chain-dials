import { NextResponse } from "next/server";
import { fetchTip } from "@/lib/chains/fetch";
import { isChainId } from "@/lib/chains/registry";
import { freshnessHeaders, withRetryAndStale } from "@/lib/chains/resilient";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ chain: string }> },
) {
  const { chain } = await ctx.params;
  if (!isChainId(chain)) {
    return NextResponse.json({ error: "unknown chain" }, { status: 404 });
  }
  try {
    // A tip moves every block, so a stale one is only worth serving briefly.
    const result = await withRetryAndStale(`tip:${chain}`, () => fetchTip(chain), {
      maxStaleMs: 30_000,
    });
    return NextResponse.json(result.data, { headers: freshnessHeaders(result) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "tip fetch failed" },
      { status: 502 },
    );
  }
}
