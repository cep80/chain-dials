import { NextResponse } from "next/server";
import { supabaseConfigured, supabaseHealthy } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Reports this app's own dependency edges.
 *
 * Deliberately says only up/down and configured/not: the backend origin and any
 * key material stay out of the response, because this endpoint is public.
 */
export async function GET() {
  const configured = supabaseConfigured();

  const backend: "ok" | "down" | "unconfigured" = !configured
    ? "unconfigured"
    : (await supabaseHealthy())
      ? "ok"
      : "down";

  const body = {
    status: backend === "ok" ? "ok" : "degraded",
    checks: {
      // Accounts, Pro entitlement and all saved data live behind this.
      backend,
      auth_secret: Boolean(process.env.AUTH_SECRET),
      billing: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    },
  };

  return NextResponse.json(body, {
    status: backend === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
