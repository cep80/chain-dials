import { NextResponse } from "next/server";
import {
  ensureStripeCustomer,
  getStripe,
  stripeCheckoutConfigured, ensureProfile } from "@/lib/stripe";
import { requestOrigin } from "@/lib/site";
import { requireUser } from "@/lib/supabase-session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  if (!stripeCheckoutConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured yet." },
      { status: 503 },
    );
  }

  const profile = await ensureProfile(user.id, user.email);
  const customerId = await ensureStripeCustomer({
    id: user.id,
    email: user.email || profile.email || "",
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
