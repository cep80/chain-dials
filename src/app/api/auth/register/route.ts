import { NextResponse } from "next/server";
import { z } from "zod";
import { CargoError, cbAdmin, cbSignup } from "@/lib/cargobase";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(80).optional(),
});

const GENERIC_OK = {
  ok: true as const,
  message: "If this email is free, your account is ready. You can sign in.",
};

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit(`auth:register:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Need a valid email and a password of at least 8 characters." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  let userId: string;
  try {
    const session = await cbSignup(email, parsed.data.password);
    userId = session.user.id;
  } catch (err) {
    // CargoBase answers 409 for a taken address. Swallowing it keeps the reply
    // identical either way, so this endpoint cannot be used to test whether an
    // address has an account.
    if (err instanceof CargoError && err.status === 409) {
      return NextResponse.json(GENERIC_OK, { status: 201 });
    }
    throw err;
  }

  // The profile carries entitlement, which the user must not be able to set for
  // themselves, so it is written with the service role rather than their token.
  try {
    await cbAdmin("profiles", {
      method: "POST",
      body: {
        user_id: userId,
        email,
        pro_status: "none",
      },
    });
  } catch {
    // A missing profile reads as "not Pro" and is recreated by the billing
    // webhook on first purchase, so this is not worth failing the signup for.
  }

  return NextResponse.json(GENERIC_OK, { status: 201 });
}
