import type { AtmosphereTx } from "@/types/metrics";

export const RECENT_TX_CAP = 28;
/** How long a sample may linger after leaving the live tip before we drop it. */
export const RECENT_TX_MAX_AGE_MS = 22_000;

export type RecentTxRaw = {
  txid: string;
  fee: number;
  vsize: number;
  value: number;
};

/**
 * Merge a live tip sample into the rolling atmosphere set.
 * New txs get fresh:true (enter pulse). Older ones fall off by age + cap
 * so the canvas can fade them out.
 */
export function mergeRecentTxs(
  prev: AtmosphereTx[],
  incoming: RecentTxRaw[],
  now = Date.now(),
): AtmosphereTx[] {
  const byId = new Map(prev.map((t) => [t.txid, t]));

  for (const raw of incoming) {
    if (!raw?.txid || !(raw.vsize > 0)) continue;
    const old = byId.get(raw.txid);
    byId.set(raw.txid, {
      txid: raw.txid,
      fee: raw.fee,
      vsize: raw.vsize,
      value: raw.value,
      feeRate: raw.fee / raw.vsize,
      seenAt: old?.seenAt ?? now,
      fresh: !old,
      kind: "tx",
    });
  }

  const incomingIds = new Set(
    incoming.filter((t) => t?.txid).map((t) => t.txid),
  );

  return [...byId.values()]
    .filter(
      (t) => incomingIds.has(t.txid) || now - t.seenAt < RECENT_TX_MAX_AGE_MS,
    )
    .sort((a, b) => b.seenAt - a.seenAt)
    .slice(0, RECENT_TX_CAP)
    .map((t, i, arr) => {
      // Only the newest arrivals keep the enter-pulse; rest settle
      if (!t.fresh) return t;
      const newerFresh = arr.slice(0, i).some((x) => x.fresh);
      return newerFresh && now - t.seenAt > 1_500 ? { ...t, fresh: false } : t;
    });
}

/** Drop mined / removed / replaced ids so particles can die immediately. */
export function pruneRecentTxs(
  prev: AtmosphereTx[],
  gone: Iterable<string>,
): AtmosphereTx[] {
  const drop = new Set(gone);
  if (!drop.size) return prev;
  return prev.filter((t) => !drop.has(t.txid));
}

/** mempool.space often JSON-stringifies nested WS fields. */
export function parseWsField<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}
