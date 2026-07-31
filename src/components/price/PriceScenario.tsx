"use client";

import { useMemo } from "react";
import { formatPercent, formatUsdSmart } from "@/lib/format";
import {
  computePriceForecasts,
  PRICE_FORECAST_HORIZONS,
  type PriceForecastHorizonId,
} from "@/lib/price/outlook";
import type { PricePoint } from "@/lib/price/types";

const SHORT_HORIZONS: readonly PriceForecastHorizonId[] = [
  "1H",
  "6H",
  "12H",
  "24H",
  "1W",
];
const LONG_HORIZONS: readonly PriceForecastHorizonId[] = ["1M", "1Y"];

function durationLabel(ms: number) {
  if (ms >= 365 * 24 * 60 * 60 * 1000) return "1Y";
  if (ms >= 30 * 24 * 60 * 60 * 1000) return "30D";
  if (ms >= 7 * 24 * 60 * 60 * 1000) return "7D";
  if (ms >= 24 * 60 * 60 * 1000) return `${Math.round(ms / (24 * 60 * 60 * 1000))}D`;
  return `${Math.round(ms / (60 * 60 * 1000))}H`;
}

export function PriceScenario({
  shortPoints,
  longPoints,
  ticker,
  shortSource,
  longSource,
  loading,
}: {
  shortPoints: PricePoint[];
  longPoints: PricePoint[];
  ticker: string;
  shortSource: string | null;
  longSource: string | null;
  loading: boolean;
}) {
  const forecasts = useMemo(() => {
    const shortForecasts = computePriceForecasts(shortPoints, SHORT_HORIZONS);
    const longForecasts = computePriceForecasts(longPoints, LONG_HORIZONS);
    return new Map(
      [...shortForecasts, ...longForecasts].map((forecast) => [
        forecast.id,
        forecast,
      ]),
    );
  }, [longPoints, shortPoints]);
  const forecastCount = forecasts.size;
  const sources = [shortSource, longSource]
    .filter((source): source is string => source != null)
    .filter((source, index, all) => all.indexOf(source) === index)
    .join(" / ");

  return (
    <aside
      aria-labelledby="price-scenario-heading"
      className="mx-3 mb-3 rounded-[10px] border border-line/80 bg-ink-soft/45 p-3.5 md:mx-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-accent">
            Statistical price forecasts
          </p>
          <h3 id="price-scenario-heading" className="mt-1 text-sm font-semibold text-paper">
            {ticker} · 1h through 1y
          </h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-paper-muted">
          {loading ? "updating history" : `${forecastCount}/7 available`}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {PRICE_FORECAST_HORIZONS.map((horizon) => {
          const forecast = forecasts.get(horizon.id);
          return (
            <div
              key={horizon.id}
              className="rounded-md border border-line/70 bg-ink/40 p-2.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wider text-paper-muted">
                  {horizon.label}
                </p>
                {forecast ? (
                  <span className="text-[9px] uppercase tracking-wider text-paper-muted">
                    {forecast.coverage}
                  </span>
                ) : null}
              </div>
              {forecast ? (
                <>
                  <p className="mono mt-1 text-sm text-paper">
                    {formatUsdSmart(forecast.center)}
                  </p>
                  <p className="mono mt-1 text-[11px] text-paper-muted">
                    {formatUsdSmart(forecast.lower)} – {formatUsdSmart(forecast.upper)}
                  </p>
                  <p className="mt-1 text-[10px] text-paper-muted">
                    Center {formatPercent(forecast.centerChangePct, 1)} · {forecast.direction}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-paper-muted">
                  {loading
                    ? "Loading price history…"
                    : `Needs ${durationLabel(horizon.minimumHistoryMs)} of clean history.`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-paper-muted">
        Center values use 25% of observed log-return drift, capped at 60% of the volatility interval. Ranges use 1.28× realized daily volatility and expand with each forecast horizon.
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-paper-muted/90">
        Historical USD returns{sources ? ` from ${sources}` : ""} only. The 1h–1w forecasts draw on the latest 7 days; the 1m and 1y forecasts use up to one year. Every value is a statistical model output with an uncertainty interval, not a certainty. Live chain readings remain contextual until they have time-aligned history and out-of-sample validation.
      </p>
    </aside>
  );
}
