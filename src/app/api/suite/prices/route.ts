import { NextResponse } from "next/server";
import { fetchSuitePrices } from "@/lib/chains/fetch";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prices = await fetchSuitePrices();
    return NextResponse.json(prices, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=20" },
    });
  } catch (e) {
    console.error("price fetch failed", e);
    return NextResponse.json({ error: "price fetch failed" }, { status: 502 });
  }
}
