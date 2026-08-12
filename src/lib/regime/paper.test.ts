import { describe, expect, it } from "vitest";
import {
  applyPaperStance,
  emptyPaperBook,
  paperEquity,
  unrealizedPnl,
} from "@/lib/regime/paper";
import type { PaperBook } from "@/lib/regime/paper";

function autoBook(patch: Partial<PaperBook> = {}): PaperBook {
  return { ...emptyPaperBook(), auto: true, ...patch };
}

describe("applyPaperStance", () => {
  it("does nothing when auto is off", () => {
    const next = applyPaperStance(emptyPaperBook(), {
      stance: "long",
      regime: "crowded_short",
      mark: 20,
      now: 1_000,
    });
    expect(next.position).toBeNull();
    expect(next.fills).toHaveLength(0);
  });

  it("opens a short on crowded_long and books profit when price falls", () => {
    const opened = applyPaperStance(autoBook(), {
      stance: "short",
      regime: "crowded_long",
      mark: 20,
      now: 1_000,
      notionalUsd: 1_000,
    });
    expect(opened.position?.side).toBe("short");
    expect(opened.position?.qty).toBeCloseTo(50);
    expect(unrealizedPnl(opened, 18)).toBeCloseTo(100);

    const closed = applyPaperStance(opened, {
      stance: "flat",
      regime: "calm",
      mark: 18,
      now: 1_000 + 6 * 60_000,
    });
    expect(closed.position).toBeNull();
    expect(closed.realizedPnl).toBeCloseTo(100);
    expect(paperEquity(closed, 18)).toBeCloseTo(10_100);
  });

  it("skips a stance flip inside the cooldown window", () => {
    const opened = applyPaperStance(autoBook(), {
      stance: "long",
      regime: "crowded_short",
      mark: 10,
      now: 5_000,
    });
    const skipped = applyPaperStance(opened, {
      stance: "flat",
      regime: "calm",
      mark: 12,
      now: 5_000 + 60_000,
      cooldownMs: 5 * 60_000,
    });
    expect(skipped.position?.side).toBe("long");
    expect(skipped.fills).toHaveLength(1);
    expect(skipped.lastStance).toBe("long");
  });

  it("reduce closes an open book", () => {
    const opened = applyPaperStance(autoBook(), {
      stance: "long",
      regime: "crowded_short",
      mark: 10,
      now: 1,
    });
    const reduced = applyPaperStance(opened, {
      stance: "reduce",
      regime: "funding_extreme",
      mark: 10,
      now: 1 + 6 * 60_000,
    });
    expect(reduced.position).toBeNull();
    expect(reduced.lastStance).toBe("reduce");
    expect(reduced.fills.some((f) => f.action === "close")).toBe(true);
  });
});
