import type { ChainId } from "@/lib/chains/types";

/** Public write relays for one-tap NIP-07 publish. */
export const NOSTR_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.snort.social",
  "wss://nostr.wine",
] as const;

export type NostrUnsignedEvent = {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
  pubkey?: string;
};

export type NostrSignedEvent = NostrUnsignedEvent & {
  id: string;
  pubkey: string;
  sig: string;
};

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: NostrUnsignedEvent) => Promise<NostrSignedEvent>;
      nip04?: {
        encrypt: (pubkey: string, plaintext: string) => Promise<string>;
        decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
      };
    };
  }
}

export function hasNostrExtension(): boolean {
  return typeof window !== "undefined" && typeof window.nostr?.signEvent === "function";
}

export function chainHashtags(chainId: ChainId): string[] {
  switch (chainId) {
    case "btc":
      return ["bitcoin", "btc", "nostr"];
    case "eth":
      return ["ethereum", "eth", "nostr"];
    case "sol":
      return ["solana", "sol", "nostr"];
    case "hype":
      return ["hyperliquid", "hype", "nostr"];
  }
}

/** Build kind:1 tags: r=url, client, topic tags. */
export function nostrNoteTags(
  url: string,
  chainId?: ChainId,
): string[][] {
  const tags: string[][] = [
    ["r", url],
    ["client", "chaindials", "https://chaindials.com"],
  ];
  if (chainId) {
    for (const t of chainHashtags(chainId)) {
      tags.push(["t", t]);
    }
  } else {
    tags.push(["t", "nostr"], ["t", "bitcoin"]);
  }
  return tags;
}

/**
 * NIP-07 sign + multi-relay publish. Returns note1 bech32 when possible.
 */
export async function publishNostrNote(opts: {
  content: string;
  url: string;
  chainId?: ChainId;
}): Promise<{ noteId: string; njump: string; eventId: string }> {
  if (!hasNostrExtension() || !window.nostr) {
    throw new Error("NO_EXTENSION");
  }

  let pubkey = "";
  try {
    pubkey = await window.nostr.getPublicKey();
  } catch {
    // some extensions fill pubkey only inside signEvent
  }

  const unsigned: NostrUnsignedEvent = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: nostrNoteTags(opts.url, opts.chainId),
    content: opts.content,
    ...(pubkey ? { pubkey } : {}),
  };

  const signed = await window.nostr.signEvent(unsigned);
  if (!signed?.id || !signed.sig || !signed.pubkey) {
    throw new Error("SIGN_FAILED");
  }

  // Dynamic import keeps the board bundle lighter until share is used
  const { SimplePool, nip19 } = await import("nostr-tools");
  const pool = new SimplePool();
  const relays = [...NOSTR_RELAYS];

  try {
    const pubs = pool.publish(relays, signed as Parameters<typeof pool.publish>[1]);
    // Wait for at least one relay ack (or settle all briefly)
    await Promise.any(
      pubs.map(
        (p) =>
          new Promise<void>((resolve, reject) => {
            const t = window.setTimeout(() => reject(new Error("timeout")), 8_000);
            p.then(() => {
              window.clearTimeout(t);
              resolve();
            }).catch(reject);
          }),
      ),
    );
  } finally {
    pool.close(relays);
  }

  let noteId = signed.id;
  try {
    noteId = nip19.noteEncode(signed.id);
  } catch {
    noteId = signed.id;
  }

  const njump = `https://njump.me/${noteId}`;
  return { noteId, njump, eventId: signed.id };
}

/** Web clients that accept prefilled compose when no extension. */
export function nostrWebComposeUrl(content: string): string {
  // Habla / generic: copy-first; Primal home as soft handoff
  const q = encodeURIComponent(content);
  return `https://primal.net/home?compose=${q}`;
}
