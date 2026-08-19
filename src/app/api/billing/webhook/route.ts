import { NextResponse } from "next/server";
import { cbAdmin } from "@/lib/cargobase";
import type Stripe from "stripe";
import {
  findUserIdForSubscription,
  getStripe,
  syncSubscriptionToUser,
  getProfile,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";

async function resolveCheckoutUserId(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const metaUserId =
    session.client_reference_id || session.metadata?.userId || null;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  if (!metaUserId || !customerId) return null;

  const profile = await getProfile(metaUserId);
  if (!profile) return null;

  if (profile.stripe_customer_id && profile.stripe_customer_id !== customerId) {
    console.error("stripe checkout customer/user mismatch", {
      userId: metaUserId,
      customerId,
      bound: profile.stripe_customer_id,
    });
    return null;
  }

  const bound = await cbAdmin<{ user_id: string }[]>(
    `profiles?select=user_id&stripe_customer_id=eq.${encodeURIComponent(customerId)}&user_id=neq.${encodeURIComponent(metaUserId)}&limit=1`,
    {},
  );
  if (bound[0]) {
    console.error("stripe checkout customer already bound", {
      customerId,
      otherUserId: bound[0].user_id,
      metaUserId,
    });
    return null;
  }

  if (!profile.stripe_customer_id) {
    await cbAdmin(`profiles?user_id=eq.${encodeURIComponent(metaUserId)}`, {
      method: "PATCH",
      body: { stripe_customer_id: customerId },
    });
  }

  return profile.user_id;
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET missing" },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("stripe webhook verify failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = await resolveCheckoutUserId(session);
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (userId && subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscriptionToUser(userId, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await findUserIdForSubscription(sub);
        if (userId) {
          if (event.type === "customer.subscription.deleted") {
            await cbAdmin(`profiles?user_id=eq.${encodeURIComponent(userId)}`, {
              method: "PATCH",
              body: { pro_status: "canceled", stripe_subscription_id: sub.id },
            });
          } else {
            await syncSubscriptionToUser(userId, sub);
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("stripe webhook handler error", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
