import { normalizeBtcAddress } from "@/lib/forensics/address";
import type { ChainId } from "@/lib/chains/types";

const EVM = /^0x[a-fA-F0-9]{40}$/;
const SOL = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const URI = /^(bitcoin|ethereum|solana|hyperevm):/i;
const EXTENDED_PRIV = /^(xprv|yprv|zprv|tprv)/i;
const WIF = /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/;

export type WalletAddressFail = "empty" | "secret" | "shape";

export type WalletAddressResult =
  | { ok: true; address: string }
  | { ok: false; reason: WalletAddressFail };

/** Heuristic: mnemonic, extended private key, or WIF. Never treat as an address. */
export function looksLikeSecret(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/);
  if (words.length >= 8 && words.every((w) => /^[a-zA-Z]+$/.test(w))) {
    return true;
  }
  const compact = trimmed.replace(/\s+/g, "");
  if (EXTENDED_PRIV.test(compact)) return true;
  if (WIF.test(compact)) return true;
  return false;
}

function stripUri(raw: string): string {
  let t = raw.trim();
  t = t.replace(URI, "");
  const q = t.indexOf("?");
  if (q >= 0) t = t.slice(0, q);
  return t.replace(/\s+/g, "");
}

function normalizeEvm(raw: string): string | null {
  const t = stripUri(raw);
  if (!EVM.test(t)) return null;
  return t.toLowerCase();
}

function normalizeSol(raw: string): string | null {
  const t = stripUri(raw);
  if (!SOL.test(t)) return null;
  if (EVM.test(t)) return null;
  return t;
}

export function normalizeWalletAddress(
  chain: ChainId,
  raw: string,
): WalletAddressResult {
  if (!raw.trim()) return { ok: false, reason: "empty" };
  if (looksLikeSecret(raw)) return { ok: false, reason: "secret" };

  switch (chain) {
    case "btc": {
      const address = normalizeBtcAddress(stripUri(raw));
      return address
        ? { ok: true, address }
        : { ok: false, reason: "shape" };
    }
    case "eth":
    case "hype": {
      const address = normalizeEvm(raw);
      return address
        ? { ok: true, address }
        : { ok: false, reason: "shape" };
    }
    case "sol": {
      const address = normalizeSol(raw);
      return address
        ? { ok: true, address }
        : { ok: false, reason: "shape" };
    }
  }
}

export function walletPlaceholder(chain: ChainId): string {
  switch (chain) {
    case "btc":
      return "bc1q… or 1… / 3…";
    case "sol":
      return "Solana account (base58)";
    case "eth":
      return "0x… Ethereum address";
    case "hype":
      return "0x… HyperEVM / HyperCore user";
  }
}
