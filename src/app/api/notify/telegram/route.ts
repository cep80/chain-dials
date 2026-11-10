import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase-session";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { telegramConfigured, telegramStartLink } from "@/lib/notify/telegram";

export const dynamic = "force-dynamic";

const CODE_TTL_MS = 15 * 60_000;

/** Start linking Telegram: a one-time code inside a t.me deep link. */
export async function POST(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  if (!telegramConfigured()) {
    return NextResponse.json({ error: "Telegram isn't set up yet." }, { status: 503 });
  }
  const limited = rateLimit(`notify:tg-link:${gate.user.id}:${clientIp(req)}`, 10, 15 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const code = randomBytes(16).toString("base64url");
  await sbAdmin("notify_link_codes", {
    method: "POST",
    body: {
      code,
      user_id: gate.user.id,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    },
  });
  return NextResponse.json({ url: telegramStartLink(code) });
}
