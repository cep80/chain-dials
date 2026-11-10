/**
 * App Store / Google Play subscriptions through RevenueCat.
 *
 * The apps log in to RevenueCat with the Supabase user id, so a subscriber's
 * app_user_id is our user id. Like the Stripe sync, every webhook re-reads the
 * subscriber from RevenueCat rather than trusting the event, so late or
 * out-of-order events cannot leave the wrong state. Store entitlement lives
 * in its own columns (store_status / store_period_end) and never touches
 * Stripe's; effectivePro() in lib/pro.ts combines them.
 *
 * Env: REVENUECAT_SECRET_KEY (v1 secret API key), REVENUECAT_WEBHOOK_AUTH
 * (the Authorization header value set on the webhook), and
 * REVENUECAT_ENTITLEMENT (default "pro").
 */

import { sbAdmin } from "@/lib/supabase";

export type StoreEntitlement = { store_status: string; store_period_end: string | null };

export type Subscriber = {
  subscriber?: {
    entitlements?: Record<
      string,
      { expires_date?: string | null; product_identifier?: string; grace_period_expires_date?: string | null }
    >;
    subscriptions?: Record<
      string,
      { billing_issues_detected_at?: string | null; unsubscribe_detected_at?: string | null }
    >;
  };
};

export function revenueCatConfigured(): boolean {
  return Boolean(process.env.REVENUECAT_SECRET_KEY);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAppUserId(id: unknown): id is string {
  return typeof id === "string" && UUID.test(id);
}

/** Map a RevenueCat subscriber to our store columns. Pure; exported for tests. */
export function storeEntitlement(data: Subscriber, nowMs: number): StoreEntitlement {
  const key = process.env.REVENUECAT_ENTITLEMENT || "pro";
  const ent = data.subscriber?.entitlements?.[key];
  if (!ent) return { store_status: "none", store_period_end: null };
  // A null expiry is a lifetime / non-expiring grant.
  if (ent.expires_date == null) return { store_status: "active", store_period_end: null };
  const end = ent.grace_period_expires_date ?? ent.expires_date;
  const endMs = Date.parse(end);
  const sub = ent.product_identifier ? data.subscriber?.subscriptions?.[ent.product_identifier] : undefined;
  if (Number.isFinite(endMs) && endMs > nowMs) {
    return { store_status: sub?.billing_issues_detected_at ? "past_due" : "active", store_period_end: end };
  }
  // Lapsed with a billing problem: past_due keeps the usual 3-day grace.
  if (sub?.billing_issues_detected_at) return { store_status: "past_due", store_period_end: end };
  return { store_status: "canceled", store_period_end: end };
}

export async function fetchSubscriber(appUserId: string): Promise<Subscriber> {
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!res.ok) throw new Error(`RevenueCat subscriber ${res.status}`);
  return (await res.json()) as Subscriber;
}

/** Re-read one user's store subscription and write it to their profile. */
export async function syncStoreEntitlement(userId: string): Promise<StoreEntitlement> {
  const ent = storeEntitlement(await fetchSubscriber(userId), Date.now());
  await sbAdmin(`profiles?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: ent,
  });
  return ent;
}
