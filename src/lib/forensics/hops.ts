import {
  fetchAddress,
  fetchAddressTxs,
  labelDestination,
  type MempoolTx,
} from "@/lib/forensics/mempool";
import { getHolder, getVictim } from "@/lib/forensics/dataset";
import type { HopDestination, HopSpend, HopsResponse } from "@/lib/forensics/types";

function isSpendFrom(tx: MempoolTx, address: string): boolean {
  const needle = address.toLowerCase();
  return tx.vin.some((vin) => {
    const prev = vin.prevout?.scriptpubkey_address;
    return prev != null && prev.toLowerCase() === needle;
  });
}

function destinationsFrom(tx: MempoolTx): HopDestination[] {
  return tx.vout.map((vout) => {
    const addr = vout.scriptpubkey_address ?? null;
    const labeled = labelDestination(addr, vout.scriptpubkey_type);
    return {
      address: addr,
      valueSats: vout.value,
      kind: labeled.kind,
      label: labeled.label,
      scriptType: vout.scriptpubkey_type ?? null,
    };
  });
}

export async function buildHops(
  address: string,
  limit = 12,
): Promise<HopsResponse> {
  const holder = getHolder(address);
  const victim = getVictim(address);
  const [live, txs] = await Promise.all([
    fetchAddress(address).catch(() => null),
    fetchAddressTxs(address),
  ]);

  const spends: HopSpend[] = [];
  for (const tx of txs) {
    if (!isSpendFrom(tx, address)) continue;
    const destinations = destinationsFrom(tx);
    spends.push({
      txid: tx.txid,
      confirmed: !!tx.status.confirmed,
      blockHeight: tx.status.block_height ?? null,
      blockTime: tx.status.block_time ?? null,
      feeSats: tx.fee ?? null,
      totalOutSats: destinations.reduce((s, d) => s + d.valueSats, 0),
      destinations,
    });
    if (spends.length >= limit) break;
  }

  return {
    fetchedAt: Date.now(),
    address,
    meta: holder ?? victim ?? null,
    role: holder ? "holder" : victim ? "victim" : "unknown",
    live,
    spends,
  };
}
