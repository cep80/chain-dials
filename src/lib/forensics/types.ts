/** Shared Coldcard drain forensics types (safe for client). */

export type HolderRole = "collector" | "vault" | string;

export interface ForensicsSummary {
  generatedAt: string;
  source: string;
  totalSweptSats: number;
  victimAddressCount: number;
  sweepTxCount: number;
  blockSpan: [number, number];
  firstSweepTime: number;
  lastSweepTime: number;
  waveCount: number;
  attribution: string;
}

export interface HolderMeta {
  address: string;
  label: string;
  role: HolderRole;
  wave: number;
  receivedSats: number;
  sentSats: number;
}

export interface VictimMeta {
  address: string;
  valueSats: number;
  wave: number;
  sweptAt: number;
}

export interface LiveAddressStats {
  address: string;
  fundedSats: number;
  spentSats: number;
  balanceSats: number;
  txCount: number;
  mempoolBalanceSats: number;
}

export interface WatchedAddress extends HolderMeta {
  live: LiveAddressStats | null;
  error?: string;
  /** True when live spent exceeds curated baseline sent (or balance dropped). */
  moved?: boolean;
}

export interface WatchResponse {
  fetchedAt: number;
  priceUsd: number | null;
  summary: ForensicsSummary;
  watched: WatchedAddress[];
  totalLiveBalanceSats: number;
  movers: WatchedAddress[];
}

export interface LookupHit {
  kind: "victim" | "holder" | "both" | "unknown";
  address: string;
  victim?: VictimMeta;
  holder?: HolderMeta;
  live?: LiveAddressStats | null;
}

export interface LookupResponse {
  fetchedAt: number;
  query: string;
  normalized: string | null;
  valid: boolean;
  hit: LookupHit | null;
}

export type DestinationKind =
  | "tracked-vault"
  | "tracked-collector"
  | "tracked-holder"
  | "known-victim"
  | "op-return"
  | "external";

export interface HopDestination {
  address: string | null;
  valueSats: number;
  kind: DestinationKind;
  label: string;
  scriptType: string | null;
}

export interface HopSpend {
  txid: string;
  confirmed: boolean;
  blockHeight: number | null;
  blockTime: number | null;
  feeSats: number | null;
  totalOutSats: number;
  destinations: HopDestination[];
}

export interface HopsResponse {
  fetchedAt: number;
  address: string;
  meta: HolderMeta | VictimMeta | null;
  role: "holder" | "victim" | "unknown";
  live: LiveAddressStats | null;
  spends: HopSpend[];
}
