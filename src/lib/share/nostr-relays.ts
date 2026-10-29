/**
 * Public write relays for one-tap NIP-07 publish.
 *
 * Kept free of imports: next.config.ts reads this to allow the relays in the
 * Content-Security-Policy, so the list and the policy cannot drift apart.
 */
export const NOSTR_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.snort.social",
  "wss://nostr.wine",
] as const;
