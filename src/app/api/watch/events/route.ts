import { NextResponse } from "next/server";
import { sbRest } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const events = await sbRest<unknown[]>(
    "watch_events?select=id,watch_id,title,body,channel,status,at&order=at.desc&limit=50",
    { token: gate.user.token },
  );
  return NextResponse.json({ events });
}
