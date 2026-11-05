import { NextResponse } from "next/server";
import { isChainId } from "@/lib/chains/registry";
import { isProActive } from "@/lib/pro";
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
      {
        error:
          "Stripe is not configured yet. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID.",
      },
      { status: 503 },
    );
  }

  // Read fresh: the session cookie can lag a purchase made a moment ago.
  const profile = await ensureProfile(user.id, user.email);
  if (isProActive(profile.pro_status, profile.pro_current_period_end)) {
    return NextResponse.json(
      { error: "You already have Pro." },
      { status: 400 },
    );
  }

  let chain = "btc";
  try {
    const body = (await req.json()) as { chain?: string };
    if (body.chain && isChainId(body.chain)) chain = body.chain;
  } catch {
    // empty body ok
  }

  const customerId = await ensureStripeCustomer({
    id: user.id,
    email: user.email || profile.email || "",
    stripeCustomerId: profile.stripe_customer_id,
  });
  const stripe = getStripe();
  const base = requestOrigin(req);
  const priceId = process.env.STRIPE_PRICE_ID!.trim();

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/account?checkout=success`,
    cancel_url: `${base}/${chain}/pro?checkout=cancel`,
    client_reference_id: user.id,
    subscription_data: {
      metadata: { userId: user.id },
    },
    metadata: { userId: user.id },
    allow_promotion_codes: true,
  });

  if (!checkout.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: checkout.url });
}
