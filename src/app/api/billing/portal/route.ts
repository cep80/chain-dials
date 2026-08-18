import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  ensureStripeCustomer,
  getStripe,
  stripeCheckoutConfigured, ensureProfile } from "@/lib/stripe";
import { requestOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (!stripeCheckoutConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured yet." },
      { status: 503 },
    );
  }

  const profile = await ensureProfile(session.user.id, session.user.email);
  const customerId = await ensureStripeCustomer({
    id: session.user.id,
    email: session.user.email ?? profile.email ?? "",
    stripeCustomerId: profile.stripe_customer_id,
  });
  const stripe = getStripe();
  const base = requestOrigin(req);

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${base}/account`,
  });

  return NextResponse.json({ url: portal.url });
}
