/**
 * Allow only same-origin relative paths for post-auth redirects.
 * Blocks open redirects (//evil.com, https://evil.com, etc.).
 */
export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/account",
): string {
  if (!raw) return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  if (t.includes("://") || t.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(t)) return fallback;
  // Reject protocol-relative tricks and encoded separators
  if (/%2f%2f/i.test(t) || /%5c/i.test(t)) return fallback;
  return t;
}
