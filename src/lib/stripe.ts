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
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });
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

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscription.id,
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
  const metaUser = subscription.metadata?.userId;
  if (metaUser) return metaUser;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}
