import { NextRequest, NextResponse } from "next/server";
import { normalizeBtcAddress } from "@/lib/forensics/address";
import { getHolder, getVictim } from "@/lib/forensics/dataset";
import { fetchAddress } from "@/lib/forensics/mempool";
import type { LookupHit, LookupResponse } from "@/lib/forensics/types";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = rateLimit(`proxy:forensics:lookup:${clientIp(req)}`, 40, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const query = req.nextUrl.searchParams.get("address") ?? "";
  const normalized = normalizeBtcAddress(query);

  if (!normalized) {
    const body: LookupResponse = {
      fetchedAt: Date.now(),
      query,
      normalized: null,
      valid: false,
      hit: null,
    };
    return NextResponse.json(body, { status: 400 });
  }

  const holder = getHolder(normalized);
  const victim = getVictim(normalized);
  let live = null;
  try {
    live = await fetchAddress(normalized);
  } catch {
    live = null;
  }

  let hit: LookupHit | null = null;
  if (holder || victim) {
    const kind =
      holder && victim ? "both" : victim ? "victim" : "holder";
    hit = {
      kind,
      address: normalized,
      victim: victim ?? undefined,
      holder: holder ?? undefined,
      live,
    };
  } else {
    hit = {
      kind: "unknown",
      address: normalized,
      live,
    };
  }

  const body: LookupResponse = {
    fetchedAt: Date.now(),
    query,
    normalized,
    valid: true,
    hit,
  };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
