"use client";

import { Capacitor } from "@capacitor/core";
import { sessionFetch } from "@/lib/session-fetch";

export type PushPermission = "granted" | "denied" | "prompt" | "unsupported";

const channel = () =>
  Capacitor.getPlatform() === "ios" ? "push_ios" : "push_android";

let listening = false;

/** Send each token the OS hands us to the account; tokens can rotate. */
async function listen(): Promise<void> {
  if (listening) return;
  listening = true;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  await PushNotifications.addListener("registration", ({ value }) => {
    void sessionFetch("/api/notify/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: channel(), token: value }),
    }).catch(() => undefined);
  });
  await PushNotifications.addListener("registrationError", (err) => {
    console.warn("push registration failed", err);
  });
}

export async function pushPermission(): Promise<PushPermission> {
  if (!Capacitor.isNativePlatform()) return "unsupported";
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const { receive } = await PushNotifications.checkPermissions();
  return receive === "granted" ? "granted" : receive === "denied" ? "denied" : "prompt";
}

/** Ask (if needed) and register this device for watch notifications. */
export async function enablePush(): Promise<PushPermission> {
  if (!Capacitor.isNativePlatform()) return "unsupported";
  const { PushNotifications } = await import("@capacitor/push-notifications");
  let { receive } = await PushNotifications.checkPermissions();
  if (receive === "prompt" || receive === "prompt-with-rationale") {
    ({ receive } = await PushNotifications.requestPermissions());
  }
  if (receive !== "granted") return "denied";
  await listen();
  await PushNotifications.register();
  return "granted";
}

/**
 * On app start: refresh the token if permission was already given, and open
 * the right page when a notification is tapped. Never prompts.
 */
export async function bootPush(open: (path: string) => void): Promise<() => void> {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const tap = await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    ({ notification }) => {
      const path = (notification.data as { path?: unknown } | undefined)?.path;
      if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) open(path);
    },
  );
  if ((await pushPermission()) === "granted") {
    await listen();
    await PushNotifications.register();
  }
  return () => void tap.remove();
}
