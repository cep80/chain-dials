import { NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase";
import type Stripe from "stripe";
import {
  findUserIdForSubscription,
  getStripe,
  syncCustomerEntitlement,
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

  const bound = await sbAdmin<{ user_id: string }[]>(
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
    await sbAdmin(`profiles?user_id=eq.${encodeURIComponent(metaUserId)}`, {
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
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        if (userId && customerId) {
          await syncCustomerEntitlement(userId, customerId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // The payload may be stale or about an older subscription; it only
        // identifies the customer. Current state comes fresh from Stripe.
        const sub = event.data.object as Stripe.Subscription;
        const userId = await findUserIdForSubscription(sub);
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (userId && customerId) {
          await syncCustomerEntitlement(userId, customerId);
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
