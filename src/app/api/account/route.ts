import { NextResponse } from "next/server";
import { z } from "zod";
import { cbAdmin, cbDeleteUser, cbLogin, CargoError } from "@/lib/cargobase";
import { requireCargoUser } from "@/lib/cargobase-session";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getProfile, getStripe, stripeConfigured } from "@/lib/stripe";

// Every table holding rows a user owns. A new user-owned table belongs here.
const USER_TABLES = ["layouts", "alert_rules", "wall_packs", "desk_packs", "profiles"] as const;

const bodySchema = z.object({ password: z.string().min(1).max(200) });

/**
 * Delete the signed-in account (App Store 5.1.1(v), Google Play account
 * deletion policy).
 *
 * Ordered so nothing irreversible happens until every step that can fail
 * cleanly has passed: the password is checked, then billing is stopped, then
 * the CargoBase user is deleted. Only the last step, removing app rows, runs
 * after the account is gone; it uses the service role and a failure there is
 * logged for manual cleanup rather than surfaced, because the account no
 * longer exists to retry from.
 */
export async function DELETE(req: Request) {
  const gate = await requireCargoUser(req);
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
    verified = Boolean(user.email && (await cbLogin(user.email, password)));
  } catch (err) {
    if (err instanceof CargoError && err.status === 429) {
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
  if (profile?.stripe_customer_id && stripeConfigured()) {
    try {
      await getStripe().customers.del(profile.stripe_customer_id);
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
    await cbDeleteUser(user.token, password);
  } catch (err) {
    if (err instanceof CargoError && err.status === 409) {
      return NextResponse.json(
        { error: "This account administers the backend and cannot be deleted here." },
        { status: 409 },
      );
    }
    if (err instanceof CargoError && err.status === 429) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    console.error("account delete: cargobase delete failed", { userId: user.id, err });
    return NextResponse.json({ error: "Could not delete the account. Try again shortly." }, { status: 502 });
  }

  const leftovers: string[] = [];
  for (const table of USER_TABLES) {
    try {
      await cbAdmin(`${table}?user_id=eq.${encodeURIComponent(user.id)}`, { method: "DELETE" });
    } catch {
      leftovers.push(table);
    }
  }
  if (leftovers.length) {
    console.error("account delete: rows left for manual cleanup", { userId: user.id, tables: leftovers });
  }

  return NextResponse.json({ ok: true });
}
