import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runTick } from "@/lib/watch/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Only Supabase pg_cron, holding CRON_SECRET, may run the engine. */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runTick());
  } catch (err) {
    console.error("watch tick failed", err);
    return NextResponse.json({ error: "Tick failed" }, { status: 500 });
  }
}
