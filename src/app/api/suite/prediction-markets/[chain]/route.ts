import { NextResponse } from "next/server";
import { isChainId } from "@/lib/chains/registry";
import { fetchPredictionMarketCrosscheck } from "@/lib/prediction-markets/fetch-crosscheck";

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
    const payload = await fetchPredictionMarketCrosscheck(chain);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "prediction-market comparison failed",
      },
      { status: 502 },
    );
  }
}
