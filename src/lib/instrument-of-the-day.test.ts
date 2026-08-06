import { describe, expect, it } from "vitest";
import { CHAIN_ORDER } from "@/lib/chains/registry";
import { INSTRUMENT_ORDER } from "@/lib/instruments";
import { pickInstrumentOfDay } from "@/lib/instrument-of-the-day";

describe("pickInstrumentOfDay", () => {
  it("returns a valid chain + instrument for a given day", () => {
    const pick = pickInstrumentOfDay(Date.UTC(2026, 7, 4));
    expect(CHAIN_ORDER).toContain(pick.chainId);
    expect(INSTRUMENT_ORDER).toContain(pick.instrument);
  });

  it("is stable within the same UTC day", () => {
    const morning = Date.UTC(2026, 7, 4, 1, 0, 0);
    const evening = Date.UTC(2026, 7, 4, 23, 0, 0);
    expect(pickInstrumentOfDay(morning)).toEqual(pickInstrumentOfDay(evening));
  });

  it("rotates across days with correct modular indices", () => {
    const dayA = Math.floor(
      (Date.UTC(2026, 7, 4) - Date.UTC(2026, 0, 1)) / 86_400_000,
    );
    const dayB = dayA + 1;
    const a = pickInstrumentOfDay(Date.UTC(2026, 7, 4));
    const b = pickInstrumentOfDay(Date.UTC(2026, 7, 5));
    expect(a.chainId).toBe(CHAIN_ORDER[dayA % CHAIN_ORDER.length]);
    expect(a.instrument).toBe(INSTRUMENT_ORDER[dayA % INSTRUMENT_ORDER.length]);
    expect(b.chainId).toBe(CHAIN_ORDER[dayB % CHAIN_ORDER.length]);
    expect(b.instrument).toBe(INSTRUMENT_ORDER[dayB % INSTRUMENT_ORDER.length]);
  });
});
