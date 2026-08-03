import { NextRequest, NextResponse } from "next/server";
import { normalizeBtcAddress } from "@/lib/forensics/address";
import { buildHops } from "@/lib/forensics/hops";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("address") ?? "";
  const address = normalizeBtcAddress(raw);
  if (!address) {
    return NextResponse.json(
      { error: "Invalid Bitcoin address" },
      { status: 400 },
    );
  }

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(25, Math.max(1, Math.floor(limitRaw)))
    : 12;

  try {
    const data = await buildHops(address, limit);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("forensics hops error", err);
    return NextResponse.json(
      { error: "Failed to trace hops" },
      { status: 502 },
    );
  }
}
