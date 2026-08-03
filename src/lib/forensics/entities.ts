/**
 * Curated entity hints for hop destinations.
 * Not exhaustive. Expand as compliance / open-source cluster lists allow.
 * Prefer labeling tracked Coldcard drain addresses via dataset.ts first.
 */

export const KNOWN_ENTITY_LABELS: Record<string, string> = {
  // Placeholder room for confirmed exchange / LE-relevant deposit clusters.
  // Keys must be lowercase for bech32.
};

export function knownEntityLabel(address: string): string | null {
  const key = address.startsWith("bc1") ? address.toLowerCase() : address;
  return KNOWN_ENTITY_LABELS[key] ?? null;
}
