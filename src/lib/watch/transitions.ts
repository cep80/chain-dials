/**
 * Pure watch state machines. The engine fetches chain data once per tick and
 * feeds it through these; everything here is deterministic and unit-tested.
 */

import { formatChance, formatExpectedWait, soloOdds } from "@/lib/mining/solo-odds";

export type WatchKind = "tx" | "address" | "solo";

export type WatchNotice = { title: string; body: string };

export type Transition<S> = {
  state: S;
  notices: WatchNotice[];
  /** The watch has nothing left to report and can be closed. */
  done: boolean;
};

const HOUR_MS = 3_600_000;
/** Unconfirmed this long with a fee below next-block pace counts as stuck. */
export const STUCK_AFTER_MS = 6 * HOUR_MS;
export const FINAL_CONFIRMATIONS = 3;

export function shortId(id: string): string {
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}

export function formatBtc(sats: number): string {
  const btc = sats / 1e8;
  const digits = btc >= 1 ? 4 : btc >= 0.001 ? 6 : 8;
  return `${btc.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "")} BTC`;
}

// ---------------------------------------------------------------- tx

export type TxState = {
  /** Seen in the mempool or a block at least once. */
  seen?: boolean;
  confirmedHeight?: number | null;
  notifiedConfirmed?: boolean;
  notifiedStuck?: boolean;
};

export type TxReading =
  | { found: false }
  | {
      found: true;
      confirmed: boolean;
      blockHeight?: number | null;
      /** sat/vB, when known. */
      feeRate?: number | null;
    };

export function txTransition(
  prev: TxState,
  reading: TxReading,
  ctx: {
    txid: string;
    label?: string | null;
    tipHeight: number;
    nextBlockFee: number | null;
    createdAtMs: number;
    nowMs: number;
  },
): Transition<TxState> {
  const name = ctx.label?.trim() || shortId(ctx.txid);
  if (!reading.found) {
    // Watches are only created for transactions that exist, so a later miss
    // means the mempool dropped it or it was replaced (RBF).
    if (prev.seen) {
      return {
        state: prev,
        notices: [
          {
            title: "Transaction dropped",
            body: `${name} is no longer in the mempool. It was replaced or evicted, so check your wallet.`,
          },
        ],
        done: true,
      };
    }
    return { state: prev, notices: [], done: false };
  }

  const state: TxState = { ...prev, seen: true };
  const notices: WatchNotice[] = [];

  if (reading.confirmed && reading.blockHeight != null) {
    state.confirmedHeight = reading.blockHeight;
    const confs = Math.max(1, ctx.tipHeight - reading.blockHeight + 1);
    if (confs >= FINAL_CONFIRMATIONS) {
      notices.push({
        title: "Transaction settled",
        body: `${name} has ${confs} confirmations (block ${reading.blockHeight}).`,
      });
      return { state: { ...state, notifiedConfirmed: true }, notices, done: true };
    }
    if (!prev.notifiedConfirmed) {
      notices.push({
        title: "Transaction confirmed",
        body: `${name} made it into block ${reading.blockHeight}. You'll hear again at ${FINAL_CONFIRMATIONS} confirmations.`,
      });
      state.notifiedConfirmed = true;
    }
    return { state, notices, done: false };
  }

  // Unconfirmed (again, after a reorg, if it had a height).
  state.confirmedHeight = null;
  const age = ctx.nowMs - ctx.createdAtMs;
  if (
    !prev.notifiedStuck &&
    age >= STUCK_AFTER_MS &&
    reading.feeRate != null &&
    ctx.nextBlockFee != null &&
    reading.feeRate < ctx.nextBlockFee
  ) {
    notices.push({
      title: "Transaction looks stuck",
      body: `${name} pays ${reading.feeRate.toFixed(1)} sat/vB; the next block wants ~${Math.round(ctx.nextBlockFee)}. Fee-bump it (RBF or CPFP) if it's urgent.`,
    });
    state.notifiedStuck = true;
  }
  return { state, notices, done: false };
}

// ---------------------------------------------------------------- address

export type AddressState = {
  /** Totals including the mempool, in sats. Undefined until the first read. */
  received?: number;
  sent?: number;
};

export type AddressReading = {
  chainFunded: number;
  chainSpent: number;
  mempoolFunded: number;
  mempoolSpent: number;
};

export function addressTransition(
  prev: AddressState,
  reading: AddressReading,
  ctx: { address: string; label?: string | null },
): Transition<AddressState> {
  const received = reading.chainFunded + reading.mempoolFunded;
  const sent = reading.chainSpent + reading.mempoolSpent;
  const next: AddressState = { received, sent };
  // First reading is the baseline: nothing has "happened" yet.
  if (prev.received == null || prev.sent == null) {
    return { state: next, notices: [], done: false };
  }
  const name = ctx.label?.trim() || shortId(ctx.address);
  const notices: WatchNotice[] = [];
  // Totals only fall when a mempool tx is evicted; just re-baseline then.
  if (received > prev.received) {
    notices.push({
      title: "Wallet received",
      body: `${name} received ${formatBtc(received - prev.received)}.`,
    });
  }
  if (sent > prev.sent) {
    notices.push({
      title: "Wallet spent",
      body: `${name} sent ${formatBtc(sent - prev.sent)}.`,
    });
  }
  return { state: next, notices, done: false };
}

// ---------------------------------------------------------------- solo

export type SoloState = {
  /** UTC date (YYYY-MM-DD) of the last daily summary. */
  lastSummaryDay?: string;
  lastWinHeight?: number;
};

export type SoloParams = { ths?: number };

/** Blocks whose coinbase paid this address. */
export type SoloWin = { height: number; rewardSats: number };

export const SUMMARY_HOUR_UTC = 12;

export function soloTransition(
  prev: SoloState,
  wins: SoloWin[],
  ctx: {
    address: string;
    label?: string | null;
    params: SoloParams;
    nowMs: number;
    difficulty: number | null;
    networkHashrate: number | null;
  },
): Transition<SoloState> {
  const name = ctx.label?.trim() || shortId(ctx.address);
  const state: SoloState = { ...prev };
  const notices: WatchNotice[] = [];

  for (const win of wins) {
    if (state.lastWinHeight != null && win.height <= state.lastWinHeight) continue;
    notices.push({
      title: "Your miner found a block",
      body: `${name} won block ${win.height} for ${formatBtc(win.rewardSats)}. Congratulations.`,
    });
    state.lastWinHeight = win.height;
  }

  const now = new Date(ctx.nowMs);
  const day = now.toISOString().slice(0, 10);
  const ths = Number(ctx.params.ths);
  if (
    state.lastSummaryDay !== day &&
    now.getUTCHours() >= SUMMARY_HOUR_UTC &&
    ths > 0 &&
    ctx.difficulty
  ) {
    const odds = soloOdds({
      hashrate: ths * 1e12,
      difficulty: ctx.difficulty,
      networkHashrate: ctx.networkHashrate,
    });
    if (odds) {
      notices.push({
        title: "Solo odds today",
        body: `At ${ths} TH/s: ${formatChance(odds.perDay)} today, ${formatChance(odds.perYear)} this year. Expected wait ${formatExpectedWait(odds.expectedSeconds)}.`,
      });
      state.lastSummaryDay = day;
    }
  }

  return { state, notices, done: false };
}
