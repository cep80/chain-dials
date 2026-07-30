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
