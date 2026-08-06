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

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "");
}

/** Hosts we may use for Stripe success/cancel/return URLs. */
function allowedRedirectHosts(): Set<string> {
  const allowed = new Set<string>();
  const add = (raw: string | undefined) => {
    if (!raw) return;
    try {
      const withProto = raw.includes("://") ? raw : `https://${raw}`;
      allowed.add(normalizeHost(new URL(withProto).host));
    } catch {
      // ignore malformed env
    }
  };
  add(process.env.NEXT_PUBLIC_SITE_URL);
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  add(process.env.VERCEL_URL);
  add(siteUrl());
  if (process.env.NODE_ENV !== "production") {
    allowed.add("localhost:3000");
    allowed.add("127.0.0.1:3000");
  }
  return allowed;
}

/**
 * Base URL for Stripe redirects. Uses the request host only when it matches
 * an allowlist (site URL / Vercel hosts / local dev). Never trust a bare
 * X-Forwarded-Host from an attacker.
 */
export function requestOrigin(req: Request): string {
  const canonical = siteUrl().replace(/\/$/, "");
  const hostRaw =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.trim();
  if (!hostRaw) return canonical;

  const host = normalizeHost(hostRaw);
  if (!allowedRedirectHosts().has(host)) {
    return canonical;
  }

  const forwarded = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const proto =
    forwarded === "http" || forwarded === "https"
      ? forwarded
      : host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https";
  return `${proto}://${host}`.replace(/\/$/, "");
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
