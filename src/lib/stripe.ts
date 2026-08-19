import Stripe from "stripe";
import { cbAdmin } from "@/lib/cargobase";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2026-07-29.dahlia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function stripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_ID?.trim() &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
}

export function stripeCheckoutConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRICE_ID?.trim(),
  );
}

export type Profile = {
  user_id: string;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  pro_status: string;
  pro_current_period_end: string | null;
};

const PROFILE_COLS =
  "user_id,email,stripe_customer_id,stripe_subscription_id,pro_status,pro_current_period_end";

/**
 * Billing runs with the service role: a webhook has no user session, and
 * entitlement must not be writable by the user it belongs to. Every call here
 * therefore has to scope itself by user_id explicitly — RLS is not doing it.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const rows = await cbAdmin<Profile[]>(
    `profiles?select=${PROFILE_COLS}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    {},
  );
  return rows[0] ?? null;
}

/** Creates the profile row if signup did not. */
export async function ensureProfile(
  userId: string,
  email?: string | null,
): Promise<Profile> {
  const existing = await getProfile(userId);
  if (existing) return existing;
  const [row] = await cbAdmin<Profile[]>("profiles", {
    method: "POST",
    representation: true,
    body: { user_id: userId, email: email ?? null, pro_status: "none" },
  });
  return row;
}

export async function ensureStripeCustomer(user: {
  id: string;
  email: string;
  name?: string | null;
  stripeCustomerId?: string | null;
}): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const fresh = await ensureProfile(user.id, user.email);
  if (fresh.stripe_customer_id) return fresh.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  // Conditional on the column still being null, so two concurrent checkouts
  // cannot both bind a customer. The loser reads back the winner's id.
  const claimed = await cbAdmin<Profile[]>(
    `profiles?user_id=eq.${encodeURIComponent(user.id)}&stripe_customer_id=is.null`,
    {
      method: "PATCH",
      representation: true,
      body: { stripe_customer_id: customer.id },
    },
  );

  if (claimed.length === 0) {
    const winner = await getProfile(user.id);
    if (winner?.stripe_customer_id) {
      // Lost the race; leave the orphan customer for Stripe cleanup later.
      return winner.stripe_customer_id;
    }
  }

  return customer.id;
}

export async function syncSubscriptionToUser(
  userId: string,
  subscription: Stripe.Subscription,
) {
  const status = subscription.status;
  const proStatus =
    status === "active" || status === "trialing"
      ? status
      : status === "past_due"
        ? "past_due"
        : status === "canceled" || status === "unpaid"
          ? "canceled"
          : "none";

  const periodEndSec =
    // Stripe SDK types vary; read defensively
    (subscription as unknown as { current_period_end?: number })
      .current_period_end ?? null;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  await ensureProfile(userId);
  await cbAdmin(`profiles?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: {
      stripe_subscription_id: subscription.id,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
      pro_status: proStatus,
      pro_current_period_end: periodEndSec
        ? new Date(periodEndSec * 1000).toISOString()
        : null,
    },
  });
}

export async function findUserIdForSubscription(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;

  // Prefer durable customer binding over mutable metadata.
  const byCustomer = await cbAdmin<Profile[]>(
    `profiles?select=${PROFILE_COLS}&stripe_customer_id=eq.${encodeURIComponent(customerId)}&limit=1`,
    {},
  );
  if (byCustomer[0]) return byCustomer[0].user_id;

  const metaUser = subscription.metadata?.userId;
  if (!metaUser) return null;
  const byMeta = await getProfile(metaUser);
  if (!byMeta) return null;
  if (byMeta.stripe_customer_id && byMeta.stripe_customer_id !== customerId) {
    console.error("stripe subscription customer/user mismatch", {
      userId: metaUser,
      customerId,
      bound: byMeta.stripe_customer_id,
    });
    return null;
  }
  return byMeta.user_id;
}
