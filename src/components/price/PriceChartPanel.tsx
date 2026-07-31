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
  const range = rangeOverride ?? (hydrated ? defaultPriceRange : "7D");
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
      className="mt-8 overflow-hidden rounded-[14px] border border-line bg-ink-elevated/60"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-4 border-b border-line/80 px-4 py-4 md:flex-row md:items-start md:justify-between md:px-5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-paper-muted">
            Spot · USD
          </p>
          <h2
            id="price-chart-heading"
            className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1"
          >
            <span className="text-2xl font-bold tracking-tight text-paper md:text-3xl">
              {chain.ticker}
            </span>
            <span className="mono text-2xl font-medium text-paper md:text-3xl">
              {formatUsdSmart(close)}
            </span>
            {stats ? (
              <span
                className="mono text-sm font-medium"
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
          {stats ? (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-paper-muted">
              <span>
                Open{" "}
                <span className="mono text-paper/90">
                  {formatUsdSmart(stats.open)}
                </span>
              </span>
              <span>
                High{" "}
                <span className="mono text-paper/90">
                  {formatUsdSmart(stats.high)}
                </span>
              </span>
              <span>
                Low{" "}
                <span className="mono text-paper/90">
                  {formatUsdSmart(stats.low)}
                </span>
              </span>
              {stats.volumeSum != null ? (
                <span>
                  Vol{" "}
                  <span className="mono text-paper/90">
                    {formatCompactUsd(stats.volumeSum)}
                  </span>
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-xs text-paper-muted">
              Historical USD path for this board. Scrub the chart for a reading.
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
                    className={`min-h-9 rounded-md px-2.5 text-xs font-medium transition ${
                      on
                        ? "bg-accent text-ink"
                        : "border border-line text-paper-muted hover:border-accent/50 hover:text-paper"
                    }`}
                  >
                    {id}
                  </button>
                );
              })}
            </div>
          </Hint>
          <div className="flex flex-wrap items-center gap-2">
            <Hint tip="chart.mode" as="div">
              <div
                role="group"
                aria-label="Chart style"
                className="flex overflow-hidden rounded-md border border-line"
              >
                <button
                  type="button"
                  onClick={() => setMode("line")}
                  className={`min-h-9 px-3 text-xs transition ${
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
                  className={`min-h-9 border-l border-line px-3 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
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
              className="min-h-9 rounded-md border border-line px-3 text-xs text-paper-muted transition hover:border-accent/50 hover:text-paper"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="relative px-2 pb-2 pt-1 md:px-3">
        {loading && !data ? (
          <div
            className="flex h-[280px] animate-pulse items-center justify-center rounded-lg bg-ink-soft/40 text-sm text-paper-muted"
            aria-busy
          >
            Loading history…
          </div>
        ) : error && !data ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-3 text-sm text-paper-muted">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-md border border-line px-3 py-2 text-xs text-paper hover:border-accent"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="absolute right-4 top-3 z-10 rounded bg-ink/80 px-2 py-0.5 text-[10px] uppercase tracking-wider text-paper-muted">
                Updating…
              </div>
            ) : null}
            {error ? (
              <div className="mb-2 px-2 text-xs text-warn">{error}</div>
            ) : null}
            <PriceChart
              points={points}
              candles={activeMode === "candle" ? candles : []}
              mode={activeMode}
              accent={chain.accent}
              positive={positive}
            />
          </>
        )}
      </div>

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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/80 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-paper-muted md:px-5">
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
