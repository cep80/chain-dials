import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { SupabaseError, sbSignOutEverywhere, sbUpdatePassword } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  accessToken: z.string().min(20).max(4096),
  password: z.string().min(8).max(128),
});

/** Second half of a password reset: the recovery link's token plus the new password. */
export async function POST(req: Request) {
  const limited = rateLimit(`auth:reset:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a password of at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    await sbUpdatePassword(parsed.data.accessToken, parsed.data.password);
  } catch (err) {
    if (err instanceof SupabaseError && (err.status === 401 || err.status === 403)) {
      return NextResponse.json(
        { error: "This reset link has expired or was already used. Request a new one." },
        { status: 401 },
      );
    }
    if (err instanceof SupabaseError && err.code === "same_password") {
      return NextResponse.json(
        { error: "That is your current password. Choose a different one." },
        { status: 422 },
      );
    }
    if (err instanceof SupabaseError && err.code === "weak_password") {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }

  // The recovery token is an ordinary hour-long session, so without this it
  // could set the password again. Ending every session also signs out anyone
  // else using the old password, which is usually why people reset.
  try {
    await sbSignOutEverywhere(parsed.data.accessToken);
  } catch (err) {
    console.error("password reset: sign-out everywhere failed", err);
  }
  return NextResponse.json({ ok: true });
}
