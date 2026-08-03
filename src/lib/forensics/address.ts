/** Bitcoin address shape checks (mainnet bech32 / base58). Not a full checksum audit. */

const BECH32 = /^bc1[ac-hj-np-z02-9]{8,87}$/i;
const BASE58 = /^[13][a-km-zA-HJ-NP-Z1-9]{24,34}$/;

export function normalizeBtcAddress(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, "");
  if (!trimmed) return null;
  if (BECH32.test(trimmed)) return trimmed.toLowerCase();
  if (BASE58.test(trimmed)) return trimmed;
  return null;
}

export function isLikelyBtcAddress(raw: string): boolean {
  return normalizeBtcAddress(raw) != null;
}
