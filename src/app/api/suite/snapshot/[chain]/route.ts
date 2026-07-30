import { NextResponse } from "next/server";
import { isChainId } from "@/lib/chains/registry";
import { fetchChainSnapshot } from "@/lib/chains/snapshot";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ chain: string }> },
) {
  const { chain } = await ctx.params;
  if (!isChainId(chain) || chain === "btc") {
    return NextResponse.json({ error: "unknown chain" }, { status: 404 });
  }
  try {
    const snap = await fetchChainSnapshot(chain);
    return NextResponse.json(snap);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "snapshot failed" },
      { status: 502 },
    );
  }
}
