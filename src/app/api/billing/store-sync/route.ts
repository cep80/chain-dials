import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase-session";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { revenueCatConfigured, syncStoreEntitlement } from "@/lib/revenuecat";
import { isProActive } from "@/lib/pro";

export const dynamic = "force-dynamic";

/**
 * Called by the app right after a store purchase or restore, so Pro unlocks
 * without waiting for RevenueCat's webhook.
 */
export async function POST(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  if (!revenueCatConfigured()) {
    return NextResponse.json({ error: "Store purchases aren't set up yet." }, { status: 503 });
  }
  const limited = rateLimit(`billing:store-sync:${gate.user.id}`, 10, 10 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);
  try {
    const ent = await syncStoreEntitlement(gate.user.id);
    return NextResponse.json({ pro: isProActive(ent.store_status, ent.store_period_end) });
  } catch (err) {
    console.error("store sync failed", err);
    return NextResponse.json({ error: "Couldn't check your purchase. Try again." }, { status: 502 });
  }
}
