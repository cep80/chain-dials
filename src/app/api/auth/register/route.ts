import { NextResponse } from "next/server";
import { z } from "zod";
import { SupabaseError, sbSignup } from "@/lib/supabase";
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

  try {
    // The profile, which carries entitlement, is created by a database trigger
    // on auth.users, so nothing here writes it.
    await sbSignup(email, parsed.data.password);
  } catch (err) {
    // A taken address comes back as 422 user_already_exists. Swallowing it
    // keeps the reply identical either way, so this endpoint cannot be used to
    // test whether an address has an account.
    if (err instanceof SupabaseError && err.code === "user_already_exists") {
      return NextResponse.json(GENERIC_OK, { status: 201 });
    }
    if (err instanceof SupabaseError && err.status === 429) {
      return NextResponse.json(
        { error: "Too many sign-ups right now. Try again shortly." },
        { status: 429 },
      );
    }
    throw err;
  }

  return NextResponse.json(GENERIC_OK, { status: 201 });
}
