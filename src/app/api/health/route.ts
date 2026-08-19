import { NextResponse } from "next/server";
import { cargobaseConfigured, getApiHealthUrl } from "@/lib/cargobase";

export const dynamic = "force-dynamic";

/**
 * Reports this app's own dependency edges.
 *
 * Deliberately says only up/down and configured/not: the backend origin and any
 * key material stay out of the response, because this endpoint is public.
 */
export async function GET() {
  const configured = cargobaseConfigured();

  let backend: "ok" | "down" | "unconfigured" = configured ? "down" : "unconfigured";
  if (configured) {
    try {
      const res = await fetch(getApiHealthUrl(), {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      backend = res.ok ? "ok" : "down";
    } catch {
      backend = "down";
    }
  }

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
