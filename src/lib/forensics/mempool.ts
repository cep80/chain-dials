import type { DestinationKind, LiveAddressStats } from "@/lib/forensics/types";
import { getHolder, getVictim } from "@/lib/forensics/dataset";
import { knownEntityLabel } from "@/lib/forensics/entities";

const UPSTREAM = "https://mempool.space/api";

export interface MempoolAddressResponse {
  address: string;
  chain_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
  mempool_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
}

export interface MempoolVout {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address?: string;
  value: number;
}

export interface MempoolVin {
  txid?: string;
  vout?: number;
  prevout?: {
    scriptpubkey_address?: string;
    value: number;
    scriptpubkey_type?: string;
  };
  is_coinbase?: boolean;
}

export interface MempoolTx {
  txid: string;
  fee?: number;
  vin: MempoolVin[];
  vout: MempoolVout[];
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${UPSTREAM}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`mempool ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function toLiveStats(
  address: string,
  data: MempoolAddressResponse,
): LiveAddressStats {
  const c = data.chain_stats;
  const m = data.mempool_stats;
  const chainBal = c.funded_txo_sum - c.spent_txo_sum;
  const memBal = m.funded_txo_sum - m.spent_txo_sum;
  return {
    address,
    fundedSats: c.funded_txo_sum,
    spentSats: c.spent_txo_sum,
    balanceSats: chainBal,
    txCount: c.tx_count,
    mempoolBalanceSats: memBal,
  };
}

export async function fetchAddress(address: string): Promise<LiveAddressStats> {
  const data = await getJson<MempoolAddressResponse>(`/address/${address}`);
  return toLiveStats(address, data);
}

export async function fetchAddressTxs(
  address: string,
): Promise<MempoolTx[]> {
  return getJson<MempoolTx[]>(`/address/${address}/txs`);
}

export async function fetchPriceUsd(): Promise<number | null> {
  try {
    const prices = await getJson<{ USD?: number }>("/v1/prices");
    return typeof prices.USD === "number" ? prices.USD : null;
  } catch {
    return null;
  }
}

/** Sequential batches to stay polite with the public explorer. */
export async function fetchAddressesBatched(
  addresses: string[],
  batchSize = 4,
): Promise<Map<string, LiveAddressStats | Error>> {
  const out = new Map<string, LiveAddressStats | Error>();
  for (let i = 0; i < addresses.length; i += batchSize) {
    const slice = addresses.slice(i, i + batchSize);
    const results = await Promise.allSettled(slice.map((a) => fetchAddress(a)));
    results.forEach((r, idx) => {
      const addr = slice[idx]!;
      if (r.status === "fulfilled") out.set(addr, r.value);
      else out.set(addr, r.reason instanceof Error ? r.reason : new Error(String(r.reason)));
    });
  }
  return out;
}

export function labelDestination(
  address: string | null | undefined,
  scriptType: string | null | undefined,
): { kind: DestinationKind; label: string } {
  if (!address) {
    if (scriptType === "op_return") {
      return { kind: "op-return", label: "OP_RETURN (message)" };
    }
    return { kind: "external", label: scriptType ? `non-address (${scriptType})` : "non-address output" };
  }

  const holder = getHolder(address);
  if (holder) {
    if (holder.role === "vault") {
      return { kind: "tracked-vault", label: holder.label };
    }
    if (holder.role === "collector") {
      return { kind: "tracked-collector", label: holder.label };
    }
    return { kind: "tracked-holder", label: holder.label };
  }

  const victim = getVictim(address);
  if (victim) {
    return {
      kind: "known-victim",
      label: `Drained victim (wave ${victim.wave})`,
    };
  }

  const entity = knownEntityLabel(address);
  if (entity) {
    return { kind: "external", label: entity };
  }

  const typeBit = scriptType ? ` · ${scriptType}` : "";
  return {
    kind: "external",
    label: `External / unlabeled${typeBit}`,
  };
}
