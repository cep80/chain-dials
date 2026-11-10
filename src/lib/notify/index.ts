import { sbAdmin } from "@/lib/supabase";
import { sendApns } from "@/lib/notify/apns";
import { sendPush, type PushMessage, type SendResult } from "@/lib/notify/fcm";
import { sendTelegram } from "@/lib/notify/telegram";

export type NotifyChannel = "push_ios" | "push_android" | "telegram";

export type NotifyTarget = {
  id: string;
  user_id: string;
  channel: NotifyChannel;
  token: string;
};

export type DeliveryOutcome = {
  channel: string;
  status: "sent" | "partial" | "failed" | "no_target";
};

function sendTo(target: NotifyTarget, msg: PushMessage): Promise<SendResult> {
  if (target.channel === "telegram") return sendTelegram(target.token, msg);
  if (target.channel === "push_ios") return sendApns(target.token, msg);
  return sendPush(target.token, msg);
}

/**
 * Send one message to every target a user has, pruning dead tokens and
 * stamping live ones. The engine passes `targets` preloaded once per tick.
 */
export async function deliver(
  userId: string,
  msg: PushMessage,
  targets?: NotifyTarget[],
): Promise<DeliveryOutcome> {
  const list =
    targets ??
    (await sbAdmin<NotifyTarget[]>(
      `notify_targets?select=id,user_id,channel,token&user_id=eq.${encodeURIComponent(userId)}`,
      {},
    ));
  if (list.length === 0) return { channel: "none", status: "no_target" };

  const results = await Promise.all(list.map((t) => sendTo(t, msg)));
  const ok = list.filter((_, i) => results[i] === "ok");
  const dead = list.filter((_, i) => results[i] === "dead");

  await Promise.allSettled([
    dead.length
      ? sbAdmin(`notify_targets?id=in.(${dead.map((t) => t.id).join(",")})`, { method: "DELETE" })
      : null,
    ok.length
      ? sbAdmin(`notify_targets?id=in.(${ok.map((t) => t.id).join(",")})`, {
          method: "PATCH",
          body: { last_ok_at: new Date().toISOString() },
        })
      : null,
  ]);

  const channel = [...new Set(ok.map((t) => t.channel))].join(",") || "none";
  const status = ok.length === list.length ? "sent" : ok.length > 0 ? "partial" : "failed";
  return { channel, status };
}
