import { NextResponse } from "next/server";
import { auth } from "@/auth";
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
      { error: "Stripe is not configured yet." },
      { status: 503 },
    );
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

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${base}/account`,
  });

  return NextResponse.json({ url: portal.url });
}
