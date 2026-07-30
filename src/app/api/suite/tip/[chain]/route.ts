import { NextResponse } from "next/server";
import { fetchTip } from "@/lib/chains/fetch";
import { isChainId } from "@/lib/chains/registry";

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
    const tip = await fetchTip(chain);
    return NextResponse.json(tip);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "tip fetch failed" },
      { status: 502 },
    );
  }
}
