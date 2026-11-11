import { NextResponse } from "next/server";
import { loadWidget } from "@/lib/widget";

export const dynamic = "force-dynamic";

/**
 * Feed for the native home-screen widgets (ios/App/ChainDialsWidget,
 * android/.../widget). Public data only, no auth.
 *
 * The CDN holds one reading for a minute so a whole fleet of widgets waking
 * at once costs a single upstream round.
 */
export async function GET() {
  const body = await loadWidget();
  const empty = body.price == null && body.block == null && body.fees == null;
  if (empty) {
    return NextResponse.json({ error: "widget feeds unavailable" }, { status: 502 });
  }
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
