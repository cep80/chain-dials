import Stripe from "stripe";
import { prisma } from "@/lib/db";

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

export async function ensureStripeCustomer(user: {
  id: string;
  email: string;
  name?: string | null;
  stripeCustomerId?: string | null;
}): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });
  if (fresh?.stripeCustomerId) return fresh.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  const claimed = await prisma.user.updateMany({
    where: { id: user.id, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });

  if (claimed.count === 0) {
    const winner = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true },
    });
    if (winner?.stripeCustomerId) {
      // Lost the race; leave the orphan customer for Stripe cleanup later.
      return winner.stripeCustomerId;
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

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscription.id,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      proStatus,
      proCurrentPeriodEnd: periodEndSec
        ? new Date(periodEndSec * 1000)
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
  const byCustomer = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (byCustomer) return byCustomer.id;

  const metaUser = subscription.metadata?.userId;
  if (!metaUser) return null;
  const byMeta = await prisma.user.findUnique({
    where: { id: metaUser },
    select: { id: true, stripeCustomerId: true },
  });
  if (!byMeta) return null;
  if (byMeta.stripeCustomerId && byMeta.stripeCustomerId !== customerId) {
    console.error("stripe subscription customer/user mismatch", {
      userId: metaUser,
      customerId,
      bound: byMeta.stripeCustomerId,
    });
    return null;
  }
  return byMeta.id;
}
