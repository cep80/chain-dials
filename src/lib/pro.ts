/**
 * Pro feature flag. When false (default): Alerts stay Preview-gated;
 * Wall is free. When true: Alerts unlock local rules UI (still no paid billing).
 */
export function isProEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PRO_ENABLED === "true";
}
