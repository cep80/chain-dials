import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";
import { sbRecover } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ email: z.string().email().max(254) });

// Same reply for every address, so this cannot be used to find accounts.
const GENERIC_OK = {
  ok: true as const,
  message: "If that address has an account, a reset link is on its way.",
};

export async function POST(req: Request) {
  const limited = rateLimit(`auth:forgot:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    await sbRecover(parsed.data.email.toLowerCase().trim(), `${siteUrl()}/account/reset`);
  } catch (err) {
    // Supabase throttles resends per address; a refusal is not the caller's
    // business and must not change the reply.
    console.error("password reset request failed", err);
  }
  return NextResponse.json(GENERIC_OK);
}
