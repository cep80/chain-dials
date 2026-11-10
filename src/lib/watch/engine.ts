/**
 * One engine tick: read Bitcoin once, advance every entitled watch, notify.
 *
 * Called each minute by Supabase pg_cron through /api/cron/tick. All database
 * access is service-role (sbAdmin), so every query scopes itself explicitly.
 */

import { sbAdmin } from "@/lib/supabase";
import {
  fetchAddressRaw,
  fetchTxOrNull,
  mempoolJson,
  mempoolText,
  type MempoolTx,
} from "@/lib/forensics/mempool";
import { entitledWatches, type EntitlementProfile } from "@/lib/entitlement";
import { ENTITLEMENT_COLS } from "@/lib/pro";
import { deliver, type NotifyTarget } from "@/lib/notify";
import {
  addressTransition,
  soloTransition,
  SUMMARY_HOUR_UTC,
  txTransition,
  type AddressState,
  type SoloState,
  type SoloWin,
  type Transition,
  type TxState,
  type WatchKind,
  type WatchNotice,
} from "@/lib/watch/transitions";

export type WatchRow = {
  id: string;
  user_id: string;
  kind: WatchKind;
  chain_id: string;
  target: string;
  label: string | null;
  params: Record<string, unknown>;
  state: Record<string, unknown> & { checkedAt?: number };
  created_at: string;
};

type EngineMemory = { tipHeight?: number; lastAddressAt?: number };

export type TickSummary =
  | { skipped: "locked" }
  | { watches: number; notices: number; tipHeight: number | null; ms: number };

const LOCK_MS = 50_000;
/** Re-check transactions at least this often even without a new block. */
const TX_RECHECK_MS = 5 * 60_000;
const ADDRESS_RECHECK_MS = 2 * 60_000;
/** Blocks to look back over for solo wins if ticks were missed. */
const MAX_BLOCK_CATCHUP = 6;
const WATCH_PATH = "/btc/watch";

const inList = (ids: string[]) => `in.(${ids.map((id) => encodeURIComponent(id)).join(",")})`;

async function acquireLock(nowMs: number): Promise<EngineMemory | null> {
  const now = `"${new Date(nowMs).toISOString()}"`;
  const rows = await sbAdmin<{ value: EngineMemory }[]>(
    `engine_state?key=eq.tick&or=(locked_until.is.null,locked_until.lt.${encodeURIComponent(now)})&select=value`,
    {
      method: "PATCH",
      body: { locked_until: new Date(nowMs + LOCK_MS).toISOString() },
      representation: true,
    },
  );
  return rows.length ? (rows[0]!.value ?? {}) : null;
}

async function releaseLock(memory: EngineMemory): Promise<void> {
  await sbAdmin("engine_state?key=eq.tick", {
    method: "PATCH",
    body: { locked_until: null, value: memory },
  });
}

function feeRate(tx: MempoolTx): number | null {
  return tx.fee != null && tx.weight ? tx.fee / (tx.weight / 4) : null;
}

/** Coinbase payouts for the blocks after `fromHeight` up to the tip. */
async function coinbaseWins(fromHeight: number | undefined, tipHeight: number) {
  const start = Math.max(fromHeight != null ? fromHeight + 1 : tipHeight, tipHeight - MAX_BLOCK_CATCHUP + 1);
  const wins = new Map<string, SoloWin[]>();
  for (let h = start; h <= tipHeight; h++) {
    const hash = await mempoolText(`/block-height/${h}`);
    const coinbaseId = await mempoolText(`/block/${hash}/txid/0`);
    const tx = await mempoolJson<MempoolTx>(`/tx/${coinbaseId}`);
    const paid = new Map<string, number>();
    for (const out of tx.vout) {
      if (out.scriptpubkey_address) {
        paid.set(out.scriptpubkey_address, (paid.get(out.scriptpubkey_address) ?? 0) + out.value);
      }
    }
    for (const [address, sats] of paid) {
      wins.set(address, [...(wins.get(address) ?? []), { height: h, rewardSats: sats }]);
    }
  }
  return wins;
}

export async function runTick(nowMs = Date.now()): Promise<TickSummary> {
  const started = Date.now();
  const memory = await acquireLock(nowMs);
  if (!memory) return { skipped: "locked" };
  const next: EngineMemory = { ...memory };
  let noticeCount = 0;
  let watchCount = 0;
  let tipHeight: number | null = null;

  try {
    const all = await sbAdmin<WatchRow[]>(
      "watches?select=id,user_id,kind,chain_id,target,label,params,state,created_at&done_at=is.null&chain_id=eq.btc&order=created_at.asc&limit=5000",
      {},
    );
    if (all.length === 0) return { watches: 0, notices: 0, tipHeight: null, ms: Date.now() - started };

    const userIds = [...new Set(all.map((w) => w.user_id))];
    const [profiles, targets] = await Promise.all([
      sbAdmin<EntitlementProfile[]>(
        `profiles?select=user_id,${ENTITLEMENT_COLS}&user_id=${inList(userIds)}`,
        {},
      ),
      sbAdmin<NotifyTarget[]>(
        `notify_targets?select=id,user_id,channel,token&user_id=${inList(userIds)}`,
        {},
      ),
    ]);
    const watches = entitledWatches(all, profiles);
    watchCount = watches.length;

    tipHeight = Number(await mempoolText("/blocks/tip/height"));
    if (!Number.isFinite(tipHeight)) throw new Error("bad tip height");
    const newBlock = memory.tipHeight !== tipHeight;
    const fees = await mempoolJson<{ fastestFee?: number }>("/v1/fees/recommended").catch(() => null);
    const nextBlockFee = fees?.fastestFee ?? null;

    const results: { watch: WatchRow; t: Transition<Record<string, unknown>> }[] = [];

    // Transactions: on a new block, or every few minutes for the stuck check.
    for (const w of watches.filter((w) => w.kind === "tx")) {
      if (!newBlock && nowMs - (w.state.checkedAt ?? 0) < TX_RECHECK_MS) continue;
      try {
        const tx = await fetchTxOrNull(w.target);
        const t = txTransition(
          w.state as TxState,
          tx
            ? { found: true, confirmed: tx.status.confirmed, blockHeight: tx.status.block_height ?? null, feeRate: feeRate(tx) }
            : { found: false },
          {
            txid: w.target,
            label: w.label,
            tipHeight,
            nextBlockFee,
            createdAtMs: Date.parse(w.created_at),
            nowMs,
          },
        );
        results.push({ watch: w, t: { ...t, state: { ...t.state, checkedAt: nowMs } } });
      } catch (err) {
        console.error("watch tx check failed", w.id, err);
      }
    }

    // Addresses: on a new block, or every couple of minutes for mempool moves.
    const addresses = watches.filter((w) => w.kind === "address");
    if (addresses.length && (newBlock || nowMs - (memory.lastAddressAt ?? 0) >= ADDRESS_RECHECK_MS)) {
      next.lastAddressAt = nowMs;
      const unique = [...new Set(addresses.map((w) => w.target))];
      const stats = new Map<string, Awaited<ReturnType<typeof fetchAddressRaw>>>();
      for (let i = 0; i < unique.length; i += 4) {
        const slice = unique.slice(i, i + 4);
        const got = await Promise.allSettled(slice.map((a) => fetchAddressRaw(a)));
        got.forEach((r, idx) => {
          if (r.status === "fulfilled") stats.set(slice[idx]!, r.value);
        });
      }
      for (const w of addresses) {
        const s = stats.get(w.target);
        if (!s) continue;
        const t = addressTransition(
          w.state as AddressState,
          {
            chainFunded: s.chain_stats.funded_txo_sum,
            chainSpent: s.chain_stats.spent_txo_sum,
            mempoolFunded: s.mempool_stats.funded_txo_sum,
            mempoolSpent: s.mempool_stats.spent_txo_sum,
          },
          { address: w.target, label: w.label },
        );
        results.push({ watch: w, t });
      }
    }

    // Solo miners: one coinbase read per new block, matched against everyone.
    const solos = watches.filter((w) => w.kind === "solo");
    if (solos.length) {
      const wins = newBlock
        ? await coinbaseWins(memory.tipHeight, tipHeight).catch((err) => {
            console.error("coinbase read failed", err);
            return new Map<string, SoloWin[]>();
          })
        : new Map<string, SoloWin[]>();
      const summaryDue = new Date(nowMs).getUTCHours() >= SUMMARY_HOUR_UTC;
      const mining = summaryDue
        ? await mempoolJson<{ currentHashrate?: number; currentDifficulty?: number }>(
            "/v1/mining/hashrate/3d",
          ).catch(() => null)
        : null;
      for (const w of solos) {
        const t = soloTransition(w.state as SoloState, wins.get(w.target) ?? [], {
          address: w.target,
          label: w.label,
          params: w.params as { ths?: number },
          nowMs,
          difficulty: mining?.currentDifficulty ?? null,
          networkHashrate: mining?.currentHashrate ?? null,
        });
        results.push({ watch: w, t });
      }
    }

    // Notify, record, and persist state.
    const events: Record<string, unknown>[] = [];
    for (const { watch, t } of results) {
      for (const notice of t.notices) {
        noticeCount++;
        const outcome = await deliver(
          watch.user_id,
          { ...notice, path: WATCH_PATH },
          targets.filter((x) => x.user_id === watch.user_id),
        );
        events.push(eventRow(watch, notice, outcome));
      }
      const changed = JSON.stringify(t.state) !== JSON.stringify(watch.state);
      if (changed || t.done) {
        await sbAdmin(`watches?id=eq.${watch.id}`, {
          method: "PATCH",
          body: { state: t.state, ...(t.done ? { done_at: new Date(nowMs).toISOString() } : {}) },
        });
      }
    }
    if (events.length) await sbAdmin("watch_events", { method: "POST", body: events });

    next.tipHeight = tipHeight;
    return { watches: watchCount, notices: noticeCount, tipHeight, ms: Date.now() - started };
  } finally {
    await releaseLock(next).catch((err) => console.error("tick lock release failed", err));
  }
}

function eventRow(
  watch: WatchRow,
  notice: WatchNotice,
  outcome: { channel: string; status: string },
) {
  return {
    user_id: watch.user_id,
    watch_id: watch.id,
    title: notice.title,
    body: notice.body,
    channel: outcome.channel,
    status: outcome.status,
  };
}
