import { CHAIN_ORDER } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import { INSTRUMENT_ORDER, type InstrumentId } from "@/lib/instruments";

function dayIndex(nowMs: number): number {
  const start = Date.UTC(2026, 0, 1);
  return Math.floor((nowMs - start) / 86_400_000);
}

/** Stable pick for a UTC calendar day. Pure for unit tests. */
export function pickInstrumentOfDay(nowMs = Date.now()): {
  chainId: ChainId;
  instrument: InstrumentId;
} {
  const i = Math.abs(dayIndex(nowMs));
  return {
    chainId: CHAIN_ORDER[i % CHAIN_ORDER.length]!,
    instrument: INSTRUMENT_ORDER[i % INSTRUMENT_ORDER.length]!,
  };
}
