import type { ChainId } from "@/lib/chains/types";

export type WalletTxKind = "tx" | "fill" | "sig";

export interface WalletTx {
  id: string;
  kind: WalletTxKind;
  confirmed: boolean | null;
  at: number | null;
  height: number | string | null;
  /** Signed native delta when known: received positive, spent negative. */
  valueNative: number | null;
  feeNative: number | null;
  counterparty: string | null;
  label: string | null;
}

export interface WalletPosition {
  coin: string;
  size: number;
  entryPx: number | null;
  unrealizedPnl: number | null;
  positionValue: number | null;
}

export interface WalletSpotBalance {
  coin: string;
  total: number;
}

export interface WalletPerp {
  accountValueUsd: number | null;
  withdrawableUsd: number | null;
  totalNtlPos: number | null;
  positions: WalletPosition[];
  spot: WalletSpotBalance[];
}

export interface WalletHolding {
  symbol: string;
  amount: number;
  usd: number | null;
}

export interface WalletExplorerLink {
  label: string;
  url: string;
}

export interface WalletTag {
  kind: "victim" | "holder" | "both" | "entity";
  label: string;
  href: string;
}

export interface WalletLookup {
  fetchedAt: number;
  chainId: ChainId;
  query: string;
  normalized: string | null;
  valid: boolean;
  reason?: "empty" | "secret" | "shape" | "upstream";
  error?: string;
  source: string;
  explorers: WalletExplorerLink[];
  unit: string;
  balanceNative: number | null;
  pendingNative: number | null;
  receivedNative: number | null;
  sentNative: number | null;
  txCount: number | null;
  note: string | null;
  tag: WalletTag | null;
  txs: WalletTx[];
  holdings: WalletHolding[];
  perp: WalletPerp | null;
}
