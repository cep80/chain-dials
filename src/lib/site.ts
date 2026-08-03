/** Canonical public origin for share links and OG cards. */
export function siteUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;
  if (env) {
    const host = env.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

/**
 * Base URL for Stripe redirects. Prefer the request host so local checkout
 * returns to localhost instead of production NEXT_PUBLIC_SITE_URL.
 */
export function requestOrigin(req: Request): string {
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.trim();
  if (host) {
    const forwarded = req.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    const proto =
      forwarded ||
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return siteUrl().replace(/\/$/, "");
}

export const SITE_NAME = "Chain Dials";

/** Public support inbox shown on legal pages and store listings. */
export function supportEmail(): string {
  return (
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "hello@chaindials.com"
  );
}

export const LEGAL = {
  privacyPath: "/privacy",
  termsPath: "/terms",
  effectiveDate: "July 28, 2026",
} as const;
