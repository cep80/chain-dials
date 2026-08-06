"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PriceChart, type ChartMode } from "@/components/price/PriceChart";
import { PredictionMarketCrosscheck } from "@/components/price/PredictionMarketCrosscheck";
import { PriceScenario } from "@/components/price/PriceScenario";
import { Hint } from "@/components/ui/Hint";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useChain } from "@/lib/chains/context";
import {
  formatCompactUsd,
  formatPercent,
  formatRelativeAge,
  formatUsdSmart,
} from "@/lib/format";
import {
  PRICE_RANGE_ORDER,
  type PriceHistoryPayload,
  type PriceRangeId,
} from "@/lib/price/types";
import { useSettingsStore } from "@/lib/settings/store";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useDashboardStore } from "@/lib/store";

const CHART_H = 148;

function priceSourceLabel(data: PriceHistoryPayload | null) {
  if (!data) return null;
  if (data.source === "coingecko") return "CoinGecko";
  if (data.source === "binance") return "Binance";
  if (data.source === "coinbase") return "Coinbase";
  return data.source;
}

export function PriceChartPanel() {
  const chain = useChain();
  const livePrice = useDashboardStore((s) => s.live.priceUsd);
  const reduce = useAppReducedMotion();
  const defaultPriceRange = useSettingsStore((s) => s.defaultPriceRange);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const [rangeOverride, setRangeOverride] = useState<PriceRangeId | null>(null);
  const [mode, setMode] = useState<ChartMode>("line");
  const [expanded, setExpanded] = useState(false);
  const range: PriceRangeId =
    rangeOverride ?? (hydrated ? defaultPriceRange : "7D");
  const { data, loading, error, reload } = usePriceHistory(chain.id, range);
  const { data: shortForecastData, loading: shortForecastLoading } =
    usePriceHistory(chain.id, "7D");
  const { data: longForecastData, loading: longForecastLoading } =
    usePriceHistory(chain.id, "1Y");

  const stats = data?.stats ?? null;
  const close = livePrice ?? stats?.close ?? null;
  const positive =
    stats == null ? null : stats.changePct === 0 ? null : stats.changePct > 0;

  const points = data?.points ?? [];
  const candles = data?.candles ?? [];
  const canCandle = candles.length >= 2 && range !== "1H";
  const activeMode: ChartMode = canCandle ? mode : "line";

  const sourceLabel = useMemo(() => priceSourceLabel(data), [data]);
  const shortForecastSource = useMemo(
    () => priceSourceLabel(shortForecastData),
    [shortForecastData],
  );
  const longForecastSource = useMemo(
    () => priceSourceLabel(longForecastData),
    [longForecastData],
  );

  return (
    <motion.section
      aria-labelledby="price-chart-heading"
      className="price-spot-rail mt-8 overflow-hidden rounded-[12px] border border-line/70 bg-ink-elevated/35"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-3 px-3 py-3 md:flex-row md:items-center md:justify-between md:gap-4 md:px-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-paper-muted">
              Spot tape · USD
            </p>
            <h2
              id="price-chart-heading"
              className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5"
            >
              <span className="text-sm font-semibold tracking-tight text-paper">
                {chain.ticker}
              </span>
              <span className="mono text-xl font-medium tracking-tight text-paper md:text-2xl">
                {formatUsdSmart(close)}
              </span>
              {stats ? (
                <span
                  className="mono text-xs font-medium"
                  style={{
                    color:
                      positive == null
                        ? "var(--paper-muted)"
                        : positive
                          ? "var(--up)"
                          : "var(--down)",
                  }}
                >
                  {formatPercent(stats.changePct)} · {range}
                </span>
              ) : null}
            </h2>
          </div>
          {stats ? (
            <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-paper-muted">
              <span>
                O{" "}
                <span className="mono text-paper/85">
                  {formatUsdSmart(stats.open)}
                </span>
              </span>
              <span>
                H{" "}
                <span className="mono text-paper/85">
                  {formatUsdSmart(stats.high)}
                </span>
              </span>
              <span>
                L{" "}
                <span className="mono text-paper/85">
                  {formatUsdSmart(stats.low)}
                </span>
              </span>
              {stats.volumeSum != null ? (
                <span>
                  V{" "}
                  <span className="mono text-paper/85">
                    {formatCompactUsd(stats.volumeSum)}
                  </span>
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-paper-muted">
              Path under the dials. Scrub for a reading.
            </p>
          )}
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Hint tip="chart.range" as="div">
            <div
              role="tablist"
              aria-label="Chart range"
              className="flex flex-wrap gap-1"
            >
              {PRICE_RANGE_ORDER.map((id) => {
                const on = id === range;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setRangeOverride(id)}
                    className={`min-h-8 rounded-md px-2 text-[11px] font-medium transition ${
                      on
                        ? "bg-accent text-ink"
                        : "border border-line/80 text-paper-muted hover:border-accent/50 hover:text-paper"
                    }`}
                  >
                    {id}
                  </button>
                );
              })}
            </div>
          </Hint>
          <div className="flex flex-wrap items-center gap-1.5">
            <Hint tip="chart.mode" as="div">
              <div
                role="group"
                aria-label="Chart style"
                className="flex overflow-hidden rounded-md border border-line/80"
              >
                <button
                  type="button"
                  onClick={() => setMode("line")}
                  className={`min-h-8 px-2.5 text-[11px] transition ${
                    activeMode === "line"
                      ? "bg-ink-soft text-paper"
                      : "text-paper-muted hover:text-paper"
                  }`}
                >
                  Line
                </button>
                <button
                  type="button"
                  disabled={!canCandle}
                  onClick={() => canCandle && setMode("candle")}
                  className={`min-h-8 border-l border-line/80 px-2.5 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    activeMode === "candle"
                      ? "bg-ink-soft text-paper"
                      : "text-paper-muted hover:text-paper"
                  }`}
                >
                  Candles
                </button>
              </div>
            </Hint>
            <button
              type="button"
              onClick={() => void reload()}
              className="min-h-8 rounded-md border border-line/80 px-2.5 text-[11px] text-paper-muted transition hover:border-accent/50 hover:text-paper"
            >
              Refresh
            </button>
            <button
              type="button"
              disabled={!points.length}
              onClick={() => {
                const rows = [
                  "t,price",
                  ...points.map((p) => `${p.t},${p.price}`),
                ];
                const blob = new Blob([rows.join("\n")], {
                  type: "text/csv;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${chain.id}-price-${range}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="min-h-8 rounded-md border border-line/80 px-2.5 text-[11px] text-paper-muted transition hover:border-accent/50 hover:text-paper disabled:opacity-40"
            >
              CSV
            </button>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className="min-h-8 rounded-md border border-line/80 px-2.5 text-[11px] text-paper-muted transition hover:border-accent/50 hover:text-paper"
            >
              {expanded ? "Hide outlook" : "Outlook"}
            </button>
          </div>
        </div>
      </div>

      <div className="relative border-t border-line/50 px-2 pb-1.5 pt-0.5 md:px-3">
        {loading && !data ? (
          <div
            className="flex animate-pulse items-center justify-center rounded-md bg-ink-soft/35 text-xs text-paper-muted"
            style={{ height: CHART_H }}
            aria-busy
          >
            Loading history…
          </div>
        ) : error && !data ? (
          <div
            className="flex flex-col items-center justify-center gap-2 text-xs text-paper-muted"
            style={{ height: CHART_H }}
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-md border border-line px-3 py-1.5 text-[11px] text-paper hover:border-accent"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="absolute right-3 top-2 z-10 rounded bg-ink/80 px-2 py-0.5 text-[10px] uppercase tracking-wider text-paper-muted">
                Updating…
              </div>
            ) : null}
            {error ? (
              <div className="mb-1 px-2 text-[11px] text-warn">{error}</div>
            ) : null}
            <PriceChart
              points={points}
              candles={activeMode === "candle" ? candles : []}
              mode={activeMode}
              accent={chain.accent}
              positive={positive}
              height={CHART_H}
            />
          </>
        )}
      </div>

      {expanded ? (
        <>
          {data ? (
            <PriceScenario
              shortPoints={shortForecastData?.points ?? []}
              longPoints={longForecastData?.points ?? []}
              ticker={chain.ticker}
              shortSource={shortForecastSource}
              longSource={longForecastSource}
              loading={shortForecastLoading || longForecastLoading}
            />
          ) : null}
          <PredictionMarketCrosscheck chain={chain.id} />
        </>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/50 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-paper-muted md:px-4">
        <Hint tip="chart.source">
          <span className="underline decoration-dotted decoration-paper-muted/40 underline-offset-2">
            {sourceLabel ? `${sourceLabel} · ` : ""}
            historical USD
            {data ? ` · ${formatRelativeAge(data.updatedAt)}` : ""}
          </span>
        </Hint>
        <span>{points.length ? `${points.length} pts` : ""}</span>
      </div>
    </motion.section>
  );
}
