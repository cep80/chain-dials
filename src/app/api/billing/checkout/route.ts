import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isChainId } from "@/lib/chains/registry";
import { prisma } from "@/lib/db";
import {
  ensureStripeCustomer,
  getStripe,
  stripeCheckoutConfigured,
} from "@/lib/stripe";
import { requestOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (!stripeCheckoutConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured yet. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID.",
      },
      { status: 503 },
    );
  }

  if (session.user.pro) {
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

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const customerId = await ensureStripeCustomer(dbUser);
  const stripe = getStripe();
  const base = requestOrigin(req);
  const priceId = process.env.STRIPE_PRICE_ID!.trim();

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/account?checkout=success`,
    cancel_url: `${base}/${chain}/pro?checkout=cancel`,
    client_reference_id: dbUser.id,
    subscription_data: {
      metadata: { userId: dbUser.id },
    },
    metadata: { userId: dbUser.id },
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
