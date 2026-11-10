"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { blockSubsidyBtc } from "@/lib/bitcoin";
import { formatDifficulty, formatHashrate, formatRelativeAge, formatUsd } from "@/lib/format";
import { MINER_CLASS_META, MINER_CLASS_ORDER, MINERS, type MinerClass, type MinerSpec } from "@/lib/mining/miners";
import {
  expectedBtcPerDay,
  formatChance,
  formatExpectedWait,
  formatOneIn,
  formatThs,
  soloOdds,
  type SoloOdds,
} from "@/lib/mining/solo-odds";
import { useDashboardStore } from "@/lib/store";

const PREFS_KEY = "chain-dials:solo-odds:v1";

type Filter = MinerClass | "all";

interface Prefs {
  kwhUsd: number;
  rigThs: number;
  rigCount: number;
}

const DEFAULT_PREFS: Prefs = { kwhUsd: 0.1, rigThs: 1.2, rigCount: 1 };

function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<Prefs> | null;
    if (!raw) return DEFAULT_PREFS;
    const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback);
    return {
      kwhUsd: num(raw.kwhUsd, DEFAULT_PREFS.kwhUsd),
      rigThs: num(raw.rigThs, DEFAULT_PREFS.rigThs),
      rigCount: Math.max(1, Math.round(num(raw.rigCount, DEFAULT_PREFS.rigCount))),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

interface Row {
  miner: MinerSpec;
  odds: SoloOdds | null;
  evUsdDay: number | null;
  powerUsdDay: number | null;
}

export function SoloOddsBoard() {
  const hashrate = useDashboardStore((s) => s.live.hashrate);
  const difficulty = useDashboardStore((s) => s.live.difficulty);
  const height = useDashboardStore((s) => s.live.blockHeight);
  const priceUsd = useDashboardStore((s) => s.live.priceUsd);
  const nextBlockFeesSats = useDashboardStore((s) => s.live.mempoolBlocks[0]?.totalFees ?? null);
  const hashFeed = useDashboardStore((s) => s.live.feeds?.hashrate);
  // Re-render on the shell's clock so "updated" ages stay honest.
  useDashboardStore((s) => s.now);

  const [filter, setFilter] = useState<Filter>("all");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);
  // What is typed in Units, so the field can sit empty mid-edit.
  const [unitsDraft, setUnitsDraft] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPrefs(loadPrefs());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs, hydrated]);

  const subsidyBtc = height != null ? blockSubsidyBtc(height) : null;
  const feesBtc = nextBlockFeesSats != null ? nextBlockFeesSats / 1e8 : 0;
  const rewardBtc = subsidyBtc != null ? subsidyBtc + feesBtc : null;

  const rowFor = useMemo(
    () =>
      (miner: MinerSpec): Row => {
        const odds = difficulty != null ? soloOdds({ hashrate: miner.ths * 1e12, difficulty, networkHashrate: hashrate }) : null;
        const evUsdDay = odds && rewardBtc != null && priceUsd != null ? expectedBtcPerDay(odds, rewardBtc) * priceUsd : null;
        const powerUsdDay = miner.watts != null ? (miner.watts / 1000) * 24 * prefs.kwhUsd : null;
        return { miner, odds, evUsdDay, powerUsdDay };
      },
    [difficulty, hashrate, rewardBtc, priceUsd, prefs.kwhUsd],
  );

  const groups = useMemo(
    () =>
      MINER_CLASS_ORDER.filter((c) => filter === "all" || filter === c).map((c) => ({
        cls: c,
        rows: MINERS.filter((m) => m.class === c).map(rowFor),
      })),
    [filter, rowFor],
  );

  const rig: Row = rowFor({
    id: "your-rig",
    name: prefs.rigCount > 1 ? `Your rig × ${prefs.rigCount}` : "Your rig",
    maker: "Custom",
    class: "home",
    ths: prefs.rigThs * prefs.rigCount,
    watts: null,
  });

  const waiting = difficulty == null;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Live network inputs">
        <Stat label="Difficulty" value={formatDifficulty(difficulty)} />
        <Stat label="Network hashrate" value={formatHashrate(hashrate)} />
        <Stat
          label="Block reward"
          value={rewardBtc != null ? `${rewardBtc.toFixed(3)} BTC` : "-"}
          hint={subsidyBtc != null ? `${subsidyBtc} subsidy + ${feesBtc.toFixed(3)} next-block fees` : undefined}
        />
        <Stat
          label="Odds updated"
          value={formatRelativeAge(hashFeed?.updatedAt)}
          hint={hashFeed?.error ? "Feed hiccup: showing the last good reading" : "Recomputed on every hashrate refresh"}
          live={!waiting && !hashFeed?.error}
        />
      </section>

      <section className="rounded-[14px] border border-line bg-ink-elevated p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm text-paper">
            Your hashrate
            <span className="mt-1 flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                className="mono w-28 rounded-[8px] border border-line bg-ink px-2 py-1.5"
                value={prefs.rigThs}
                onChange={(e) => setPrefs((p) => ({ ...p, rigThs: Math.max(0, Number(e.target.value) || 0) }))}
              />
              <span className="text-xs text-paper-muted">TH/s</span>
            </span>
          </label>
          <label className="text-sm text-paper">
            Units
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              className="mono mt-1 block w-20 rounded-[8px] border border-line bg-ink px-2 py-1.5"
              value={unitsDraft ?? prefs.rigCount}
              onChange={(e) => {
                setUnitsDraft(e.target.value);
                const units = Math.round(Number(e.target.value));
                if (units >= 1) setPrefs((p) => ({ ...p, rigCount: units }));
              }}
              onBlur={() => setUnitsDraft(null)}
            />
          </label>
          <label className="text-sm text-paper">
            Power price
            <span className="mt-1 flex items-center gap-2">
              <span className="text-xs text-paper-muted">$</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                className="mono w-20 rounded-[8px] border border-line bg-ink px-2 py-1.5"
                value={prefs.kwhUsd}
                onChange={(e) => setPrefs((p) => ({ ...p, kwhUsd: Math.max(0, Number(e.target.value) || 0) }))}
              />
              <span className="text-xs text-paper-muted">/kWh</span>
            </span>
          </label>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <RigStat label="Per block" value={formatOneIn(rig.odds?.perBlock)} />
          <RigStat label="Per day" value={formatChance(rig.odds?.perDay)} />
          <RigStat label="Per year" value={formatChance(rig.odds?.perYear)} />
          <RigStat label="Expected wait" value={formatExpectedWait(rig.odds?.expectedSeconds)} />
        </div>
        <p className="mt-4 text-sm text-paper-muted">
          Mining solo?{" "}
          <Link
            href={`/btc/watch?kind=solo&ths=${encodeURIComponent(String(prefs.rigThs * prefs.rigCount))}`}
            className="font-semibold text-accent hover:underline"
          >
            Tell me if I hit a block →
          </Link>
        </p>
      </section>

      <div className="-mx-1 flex flex-wrap gap-2" role="group" aria-label="Filter miners">
        {(["all", ...MINER_CLASS_ORDER] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-9 rounded-full border px-3 text-xs transition ${
              filter === f ? "border-accent bg-accent/15 text-paper" : "border-line text-paper-muted hover:text-paper"
            }`}
          >
            {f === "all" ? "All miners" : MINER_CLASS_META[f].label}
          </button>
        ))}
      </div>

      {groups.map(({ cls, rows }) => (
        <section key={cls} aria-labelledby={`solo-${cls}`}>
          <h2 id={`solo-${cls}`} className="text-lg font-bold text-paper">
            {MINER_CLASS_META[cls].label}
          </h2>
          <p className="mt-0.5 text-sm text-paper-muted">{MINER_CLASS_META[cls].blurb}</p>

          <div className="mt-3 hidden overflow-hidden rounded-[14px] border border-line md:block">
            <table className="w-full text-sm">
              <thead className="bg-ink-elevated text-left text-[11px] uppercase tracking-wider text-paper-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Miner</th>
                  <th className="px-3 py-2 text-right font-medium">Hashrate</th>
                  <th className="px-3 py-2 text-right font-medium">Per block</th>
                  <th className="px-3 py-2 text-right font-medium">Per day</th>
                  <th className="px-3 py-2 text-right font-medium">Per year</th>
                  <th className="px-3 py-2 text-right font-medium">Expected wait</th>
                  <th className="px-4 py-2 text-right font-medium">EV vs power / day</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.miner.id} className="border-t border-line">
                    <td className="px-4 py-2.5">
                      <span className="text-paper">{r.miner.name}</span>
                      <span className="block text-xs text-paper-muted">
                        {r.miner.maker}
                        {r.miner.watts != null ? ` · ${r.miner.watts.toLocaleString()} W` : ""}
                      </span>
                    </td>
                    <td className="mono px-3 py-2.5 text-right text-paper">{formatThs(r.miner.ths)}</td>
                    <td className="mono px-3 py-2.5 text-right text-paper">{formatOneIn(r.odds?.perBlock)}</td>
                    <td className="mono px-3 py-2.5 text-right text-paper">{formatChance(r.odds?.perDay)}</td>
                    <td className="mono px-3 py-2.5 text-right text-accent">{formatChance(r.odds?.perYear)}</td>
                    <td className="px-3 py-2.5 text-right text-paper">{formatExpectedWait(r.odds?.expectedSeconds)}</td>
                    <td className="mono px-4 py-2.5 text-right">
                      <Economics row={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-3 space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.miner.id} className="rounded-[12px] border border-line bg-ink-elevated p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-paper">{r.miner.name}</span>
                  <span className="mono text-xs text-paper-muted">{formatThs(r.miner.ths)}</span>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-paper-muted">Per block</dt>
                  <dd className="mono text-right text-paper">{formatOneIn(r.odds?.perBlock)}</dd>
                  <dt className="text-paper-muted">Per day</dt>
                  <dd className="mono text-right text-paper">{formatChance(r.odds?.perDay)}</dd>
                  <dt className="text-paper-muted">Per year</dt>
                  <dd className="mono text-right text-accent">{formatChance(r.odds?.perYear)}</dd>
                  <dt className="text-paper-muted">Expected wait</dt>
                  <dd className="text-right text-paper">{formatExpectedWait(r.odds?.expectedSeconds)}</dd>
                  <dt className="text-paper-muted">EV vs power / day</dt>
                  <dd className="mono text-right">
                    <Economics row={r} />
                  </dd>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-xs leading-relaxed text-paper-muted">
        Odds come from live difficulty: each hash wins with chance 1 ÷ (difficulty × 2³²), and blocks arrive as a
        Poisson process, so &ldquo;per year&rdquo; is the chance of at least one block in a year. Per-block odds use
        your share of the estimated network hashrate. Expected value smooths a reward you would actually get all at
        once or never; solo, the typical outcome for small miners is zero. Hashrate and power are nominal stock
        specs.
      </p>
    </div>
  );
}

function Economics({ row }: { row: Row }) {
  if (row.evUsdDay == null) return <span className="text-paper-muted">-</span>;
  return (
    <span>
      <span className="text-paper">{formatUsdTiny(row.evUsdDay)}</span>
      {row.powerUsdDay != null ? (
        <span className={row.powerUsdDay > row.evUsdDay ? "text-down" : "text-up"}> / {formatUsdTiny(row.powerUsdDay)}</span>
      ) : null}
    </span>
  );
}

function formatUsdTiny(n: number): string {
  if (n >= 100) return formatUsd(n);
  if (n >= 0.01) return formatUsd(n, 2);
  return "<$0.01";
}

function Stat({ label, value, hint, live }: { label: string; value: string; hint?: string; live?: boolean }) {
  return (
    <div className="rounded-[12px] border border-line bg-ink-elevated px-4 py-3">
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-paper-muted">
        {live ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up" aria-hidden /> : null}
        {label}
      </p>
      <p className="mono mt-1 text-lg text-paper">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-paper-muted">{hint}</p> : null}
    </div>
  );
}

function RigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-line bg-ink px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-paper-muted">{label}</p>
      <p className="mono mt-0.5 text-base text-accent">{value}</p>
    </div>
  );
}
