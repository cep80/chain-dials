/**
 * Telegram delivery through a Chain Dials bot (TELEGRAM_BOT_TOKEN and
 * TELEGRAM_BOT_USERNAME, from @BotFather). Users link a chat by opening
 * t.me/<bot>?start=<code>; the bot's webhook (/api/notify/telegram/webhook)
 * turns the code into a notify target.
 */

import type { PushMessage, SendResult } from "@/lib/notify/fcm";

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME);
}

export function telegramStartLink(code: string): string | null {
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  return bot ? `https://t.me/${bot}?start=${encodeURIComponent(code)}` : null;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://chaindials.com").replace(/\/+$/, "");
}

/** Plain text keeps us clear of Markdown escaping rules. Exported for tests. */
export function telegramText(msg: PushMessage): string {
  return `${msg.title}\n${msg.body}\n\n${siteUrl()}${msg.path}`;
}

export async function telegramCall(method: string, body: unknown): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
}

export async function sendTelegram(chatId: string, msg: PushMessage): Promise<SendResult> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return "error";
  try {
    const res = await telegramCall("sendMessage", {
      chat_id: chatId,
      text: telegramText(msg),
      disable_web_page_preview: true,
    });
    if (res.ok) return "ok";
    // 403: the user blocked the bot or deleted the chat.
    if (res.status === 403) return "dead";
    console.error("telegram send failed", res.status, (await res.text()).slice(0, 300));
    return "error";
  } catch (err) {
    console.error("telegram send error", err);
    return "error";
  }
}
