import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase";
import { telegramCall } from "@/lib/notify/telegram";

export const dynamic = "force-dynamic";

/**
 * Telegram bot webhook. Register it once with:
 *   setWebhook?url=https://chaindials.com/api/notify/telegram/webhook
 *     &secret_token=<TELEGRAM_WEBHOOK_SECRET>
 * Telegram then echoes the secret in a header on every update.
 */
function authorized(req: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

type Update = { message?: { chat?: { id?: number }; text?: string } };

function reply(chatId: string, text: string) {
  return telegramCall("sendMessage", { chat_id: chatId, text }).catch(() => null);
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return NextResponse.json({ ok: true });
  }
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() ?? "";
  if (chatId == null) return NextResponse.json({ ok: true });
  const chat = String(chatId);

  if (text === "/stop") {
    await sbAdmin(`notify_targets?channel=eq.telegram&token=eq.${encodeURIComponent(chat)}`, {
      method: "DELETE",
    });
    await reply(chat, "Unlinked. Chain Dials won't message this chat any more.");
    return NextResponse.json({ ok: true });
  }

  const code = /^\/start\s+([A-Za-z0-9_-]{10,64})$/.exec(text)?.[1];
  if (!code) {
    await reply(chat, "Link this chat from the Watch page on chaindials.com (Where notifications go → Telegram).");
    return NextResponse.json({ ok: true });
  }

  // Single use: delete the code as we read it.
  const rows = await sbAdmin<{ user_id: string; expires_at: string }[]>(
    `notify_link_codes?code=eq.${encodeURIComponent(code)}&select=user_id,expires_at`,
    { method: "DELETE", representation: true },
  );
  const link = rows[0];
  if (!link || Date.parse(link.expires_at) < Date.now()) {
    await reply(chat, "That link has expired. Make a new one from the Watch page.");
    return NextResponse.json({ ok: true });
  }

  await sbAdmin("notify_targets?on_conflict=channel,token", {
    method: "POST",
    upsert: true,
    body: { user_id: link.user_id, channel: "telegram", token: chat },
  });
  await reply(chat, "Linked. Your Chain Dials watches will message you here. Send /stop to unlink.");
  return NextResponse.json({ ok: true });
}
