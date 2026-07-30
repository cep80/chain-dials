import { NextResponse } from "next/server";
import { fetchSuitePrices } from "@/lib/chains/fetch";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prices = await fetchSuitePrices();
    return NextResponse.json(prices);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "price fetch failed" },
      { status: 502 },
    );
  }
}
