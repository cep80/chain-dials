import { NextResponse } from "next/server";
import { z } from "zod";
import { sbAdmin, sbRest } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase-session";
import { apnsConfigured } from "@/lib/notify/apns";
import { fcmConfigured } from "@/lib/notify/fcm";
import { telegramConfigured } from "@/lib/notify/telegram";

export const dynamic = "force-dynamic";

type Row = { id: string; channel: string; created_at: string; last_ok_at: string | null };

export async function GET(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const targets = await sbRest<Row[]>(
    "notify_targets?select=id,channel,created_at,last_ok_at&order=created_at.asc",
    { token: gate.user.token },
  );
  return NextResponse.json({
    targets,
    available: {
      pushIos: apnsConfigured(),
      pushAndroid: fcmConfigured(),
      telegram: telegramConfigured(),
    },
  });
}

const pushSchema = z.object({
  channel: z.enum(["push_ios", "push_android"]),
  token: z.string().min(20).max(4096),
});

/** Register this device's push token (from the native app). */
export async function POST(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = pushSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  const { channel, token } = parsed.data;
  // A device token belongs to whoever signed in on it last.
  await sbAdmin("notify_targets?on_conflict=channel,token", {
    method: "POST",
    upsert: true,
    body: { user_id: gate.user.id, channel, token },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await sbRest(`notify_targets?id=eq.${id}`, { token: gate.user.token, method: "DELETE" });
  return NextResponse.json({ ok: true });
}
