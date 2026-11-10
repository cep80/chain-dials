"use client";

/**
 * Pro through the App Store / Google Play, via RevenueCat. Only used inside
 * the native apps; the web keeps Stripe.
 *
 * Env (public, per platform): NEXT_PUBLIC_REVENUECAT_IOS_KEY and
 * NEXT_PUBLIC_REVENUECAT_ANDROID_KEY. The current offering's packages are
 * what we sell (monthly and annual).
 */

import { Capacitor } from "@capacitor/core";
import type { PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { sessionFetch } from "@/lib/session-fetch";

export type StorePlan = {
  id: string;
  title: string;
  price: string;
  period: "month" | "year" | "other";
};

let configuredFor: string | null = null;
const packages = new Map<string, PurchasesPackage>();

function apiKey(): string | null {
  const key =
    Capacitor.getPlatform() === "ios"
      ? process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY
      : process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY;
  return key || null;
}

export function storePurchasesAvailable(): boolean {
  return Capacitor.isNativePlatform() && apiKey() != null;
}

async function ready(userId: string) {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const key = apiKey();
  if (!key) throw new Error("Store purchases aren't set up in this build.");
  if (configuredFor == null) {
    // The RevenueCat app user id is our account id, so webhooks map straight back.
    await Purchases.configure({ apiKey: key, appUserID: userId });
    configuredFor = userId;
  } else if (configuredFor !== userId) {
    await Purchases.logIn({ appUserID: userId });
    configuredFor = userId;
  }
  return Purchases;
}

export async function loadStorePlans(userId: string): Promise<StorePlan[]> {
  const Purchases = await ready(userId);
  const offerings = await Purchases.getOfferings();
  const list = offerings.current?.availablePackages ?? [];
  packages.clear();
  return list.map((p) => {
    packages.set(p.identifier, p);
    const period =
      p.packageType === "MONTHLY" ? "month" : p.packageType === "ANNUAL" ? "year" : "other";
    return { id: p.identifier, title: p.product.title, price: p.product.priceString, period };
  });
}

/** Ask the server to re-read the store subscription; true when Pro is live. */
async function syncServer(): Promise<boolean> {
  const res = await sessionFetch("/api/billing/store-sync", { method: "POST" });
  if (!res.ok) return false;
  return Boolean(((await res.json()) as { pro?: boolean }).pro);
}

export async function buyStorePlan(
  userId: string,
  planId: string,
): Promise<"pro" | "pending" | "cancelled"> {
  const Purchases = await ready(userId);
  const pkg = packages.get(planId);
  if (!pkg) throw new Error("That plan isn't available right now.");
  try {
    await Purchases.purchasePackage({ aPackage: pkg });
  } catch (err) {
    if ((err as { userCancelled?: boolean })?.userCancelled) return "cancelled";
    throw err;
  }
  return (await syncServer()) ? "pro" : "pending";
}

export async function restoreStorePurchases(userId: string): Promise<boolean> {
  const Purchases = await ready(userId);
  await Purchases.restorePurchases();
  return syncServer();
}
