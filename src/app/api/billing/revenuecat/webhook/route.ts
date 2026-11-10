import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isAppUserId, revenueCatConfigured, syncStoreEntitlement } from "@/lib/revenuecat";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(expected);
  return got.length === want.length && timingSafeEqual(got, want);
}

type Event = {
  event?: {
    type?: string;
    app_user_id?: string;
    original_app_user_id?: string;
    aliases?: string[];
    transferred_to?: string[];
    transferred_from?: string[];
  };
};

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!revenueCatConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  let body: Event;
  try {
    body = (await req.json()) as Event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const e = body.event ?? {};
  if (e.type === "TEST") return NextResponse.json({ ok: true });

  // Every account this event could touch, including both sides of a transfer.
  const ids = new Set(
    [e.app_user_id, e.original_app_user_id, ...(e.aliases ?? []), ...(e.transferred_to ?? []), ...(e.transferred_from ?? [])].filter(
      isAppUserId,
    ),
  );
  try {
    for (const id of ids) await syncStoreEntitlement(id);
  } catch (err) {
    console.error("revenuecat sync failed", { type: e.type, err });
    // A 5xx makes RevenueCat retry later.
    return NextResponse.json({ error: "Sync failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, synced: ids.size });
}
