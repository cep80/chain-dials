import { NextResponse } from "next/server";
import { isChainId } from "@/lib/chains/registry";
import { fetchPriceHistory, isPriceRangeId } from "@/lib/price/fetch-history";
import { priceHistoryRevalidate, type PriceRangeId } from "@/lib/price/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chainRaw = searchParams.get("chain") ?? "";
  const rangeRaw = (searchParams.get("range") ?? "7D").toUpperCase();

  if (!isChainId(chainRaw)) {
    return NextResponse.json(
      { error: "chain must be btc, eth, sol, or hype" },
      { status: 400 },
    );
  }
  if (!isPriceRangeId(rangeRaw)) {
    return NextResponse.json(
      { error: "range must be 1H, 24H, 7D, 30D, 90D, 1Y, or ALL" },
      { status: 400 },
    );
  }

  const range = rangeRaw as PriceRangeId;
  const revalidate = priceHistoryRevalidate(range);

  try {
    const payload = await fetchPriceHistory(chainRaw, range, revalidate);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${revalidate}, stale-while-revalidate=${revalidate * 2}`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "price history fetch failed",
      },
      { status: 502 },
    );
  }
}
