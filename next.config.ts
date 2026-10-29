import type { NextConfig } from "next";
import { NOSTR_RELAYS } from "./src/lib/share/nostr-relays";

const isDev = process.env.NODE_ENV !== "production";

// The browser talks to third parties in only two places: the mempool.space
// live WebSocket and Nostr relays for one-tap publish. Every other feed goes
// through same-origin /api routes, so connect-src stays this short. A new
// direct-from-browser feed must be added here or it will be blocked.
//
// No nonce: that would force every page to render dynamically, and the boards
// are static. 'unsafe-inline' scripts are Next's hydration payload.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' wss://mempool.space ${NOSTR_RELAYS.join(" ")}${isDev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// Baseline hardening for every response.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing is meant to be embedded; the native shells load the site top-level.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
