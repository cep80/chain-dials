import { NextResponse } from "next/server";
import { z } from "zod";
import { sbAdmin, sbDeleteUser, sbLogin, SupabaseError } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase-session";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getProfile, getStripe, stripeConfigured } from "@/lib/stripe";

const bodySchema = z.object({ password: z.string().min(1).max(200) });

/**
 * Delete the signed-in account (App Store 5.1.1(v), Google Play account
 * deletion policy).
 *
 * The password is checked and billing stopped before the irreversible step,
 * so a wrong password or a Stripe failure leaves everything intact. Deleting
 * the Supabase user then removes every row the user owns: each app table
 * references auth.users with ON DELETE CASCADE.
 */
export async function DELETE(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  const limited = rateLimit(`account:delete:${clientIp(req)}`, 5, 15 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your password to confirm." }, { status: 400 });
  }
  const { password } = parsed.data;

  let verified = false;
  try {
    verified = Boolean(user.email && (await sbLogin(user.email, password)));
  } catch (err) {
    if (err instanceof SupabaseError && err.status === 429) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    throw err;
  }
  if (!verified) {
    return NextResponse.json({ error: "That password did not match." }, { status: 401 });
  }

  // Deleting the customer cancels any subscription at once, so a deleted
  // account is never billed again. No proration refund is issued.
  const profile = await getProfile(user.id);
  const customerId = profile?.stripe_customer_id;
  if (customerId) {
    if (!stripeConfigured()) {
      console.error("account delete: customer on file but Stripe not configured", { userId: user.id });
      return NextResponse.json(
        { error: "Could not cancel billing. Nothing was deleted; try again shortly." },
        { status: 503 },
      );
    }
    try {
      await getStripe().customers.del(customerId);
    } catch (err) {
      const missing = (err as { code?: string }).code === "resource_missing";
      if (!missing) {
        console.error("account delete: stripe customer delete failed", { userId: user.id, err });
        return NextResponse.json(
          { error: "Could not cancel billing. Nothing was deleted; try again shortly." },
          { status: 502 },
        );
      }
    }
  }

  try {
    // If the delete below fails the account lives on, and it must not point at
    // a customer that no longer exists or every later checkout would fail.
    if (customerId) {
      await sbAdmin(`profiles?user_id=eq.${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        body: {
          stripe_customer_id: null,
          stripe_subscription_id: null,
          pro_status: "canceled",
          pro_current_period_end: null,
        },
      });
    }
    await sbDeleteUser(user.id);
  } catch (err) {
    console.error("account delete: supabase delete failed", { userId: user.id, err });
    return NextResponse.json({ error: "Could not delete the account. Try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
