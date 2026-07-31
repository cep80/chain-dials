import type { PricePoint } from "@/lib/price/types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DAILY_VOLATILITY_FLOOR = 0.003;

export const PRICE_FORECAST_HORIZONS = [
  {
    id: "1H",
    label: "1 hour",
    horizonMs: HOUR_MS,
    minimumHistoryMs: DAY_MS,
    preferredHistoryMs: 7 * DAY_MS,
    maximumLookbackMs: 7 * DAY_MS,
    minimumObservations: 18,
  },
  {
    id: "6H",
    label: "6 hours",
    horizonMs: 6 * HOUR_MS,
    minimumHistoryMs: DAY_MS,
    preferredHistoryMs: 7 * DAY_MS,
    maximumLookbackMs: 7 * DAY_MS,
    minimumObservations: 18,
  },
  {
    id: "12H",
    label: "12 hours",
    horizonMs: 12 * HOUR_MS,
    minimumHistoryMs: DAY_MS,
    preferredHistoryMs: 7 * DAY_MS,
    maximumLookbackMs: 7 * DAY_MS,
    minimumObservations: 18,
  },
  {
    id: "24H",
    label: "24 hours",
    horizonMs: DAY_MS,
    minimumHistoryMs: 2 * DAY_MS,
    preferredHistoryMs: 7 * DAY_MS,
    maximumLookbackMs: 7 * DAY_MS,
    minimumObservations: 24,
  },
  {
    id: "1W",
    label: "1 week",
    horizonMs: 7 * DAY_MS,
    minimumHistoryMs: 3 * DAY_MS,
    preferredHistoryMs: 30 * DAY_MS,
    maximumLookbackMs: 30 * DAY_MS,
    minimumObservations: 36,
  },
  {
    id: "1M",
    label: "1 month",
    horizonMs: 30 * DAY_MS,
    minimumHistoryMs: 30 * DAY_MS,
    preferredHistoryMs: 180 * DAY_MS,
    maximumLookbackMs: 180 * DAY_MS,
    minimumObservations: 30,
  },
  {
    id: "1Y",
    label: "1 year",
    horizonMs: 365 * DAY_MS,
    minimumHistoryMs: 180 * DAY_MS,
    preferredHistoryMs: 365 * DAY_MS,
    maximumLookbackMs: 365 * DAY_MS,
    minimumObservations: 90,
  },
] as const;

export type PriceForecastHorizonId =
  (typeof PRICE_FORECAST_HORIZONS)[number]["id"];
export type PriceForecastDirection = "upward" | "downward" | "mixed";
export type PriceForecastCoverage = "thin" | "limited" | "broad";

export interface PriceForecast {
  id: PriceForecastHorizonId;
  label: string;
  asOf: number;
  current: number;
  lower: number;
  center: number;
  upper: number;
  horizonMs: number;
  lookbackMs: number;
  observations: number;
  centerChangePct: number;
  observedTrendPct: number;
  dailyVolatilityPct: number;
  volatilityFloorApplied: boolean;
  rangePct: number;
  direction: PriceForecastDirection;
  coverage: PriceForecastCoverage;
}

type Horizon = (typeof PRICE_FORECAST_HORIZONS)[number];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cleanPoints(rawPoints: PricePoint[]) {
  return rawPoints
    .filter(
      (point) =>
        Number.isFinite(point.t) &&
        Number.isFinite(point.price) &&
        point.price > 0,
    )
    .slice()
    .sort((a, b) => a.t - b.t)
    .filter(
      (point, index, items) =>
        index === 0 || point.t > items[index - 1]!.t,
    );
}

function calculateForecast(
  points: PricePoint[],
  horizon: Horizon,
): PriceForecast | null {
  if (points.length < horizon.minimumObservations) return null;

  const asOf = points[points.length - 1]!.t;
  const availableMs = asOf - points[0]!.t;
  if (availableMs < horizon.minimumHistoryMs) return null;

  const sampleStart = asOf - Math.min(availableMs, horizon.maximumLookbackMs);
  const sample = points.filter((point) => point.t >= sampleStart);
  if (sample.length < horizon.minimumObservations) return null;

  let elapsedDays = 0;
  let summedLogReturns = 0;
  let summedSquaredLogReturns = 0;
  for (let index = 1; index < sample.length; index++) {
    const previous = sample[index - 1]!;
    const current = sample[index]!;
    const elapsed = (current.t - previous.t) / DAY_MS;
    if (elapsed <= 0) continue;

    const logReturn = Math.log(current.price / previous.price);
    elapsedDays += elapsed;
    summedLogReturns += logReturn;
    summedSquaredLogReturns += logReturn * logReturn;
  }
  if (elapsedDays <= 0) return null;

  const dailyDrift = summedLogReturns / elapsedDays;
  const dailyVariance = Math.max(
    0,
    summedSquaredLogReturns / elapsedDays - dailyDrift * dailyDrift,
  );
  const realizedDailyVolatility = Math.sqrt(dailyVariance);
  if (!Number.isFinite(realizedDailyVolatility)) return null;

  // A flat or monotonic sample still needs a visible uncertainty interval.
  const dailyVolatility = Math.max(
    realizedDailyVolatility,
    DAILY_VOLATILITY_FLOOR,
  );
  const horizonDays = horizon.horizonMs / DAY_MS;
  const bandLogReturn = 1.28 * dailyVolatility * Math.sqrt(horizonDays);

  // Historical drift is useful only as a small input. Its influence is both
  // shrunk and capped relative to the volatility interval at every horizon.
  const shrunkDailyDrift = clamp(
    dailyDrift * 0.25,
    -Math.max(0.003, dailyVolatility * 0.35),
    Math.max(0.003, dailyVolatility * 0.35),
  );
  const centerLogReturn = clamp(
    shrunkDailyDrift * horizonDays,
    -bandLogReturn * 0.6,
    bandLogReturn * 0.6,
  );
  const current = sample[sample.length - 1]!.price;
  const trendScore =
    dailyVolatility > 0 ? dailyDrift / dailyVolatility : dailyDrift;
  const direction: PriceForecastDirection =
    trendScore > 0.16 ? "upward" : trendScore < -0.16 ? "downward" : "mixed";
  const lookbackMs = sample[sample.length - 1]!.t - sample[0]!.t;
  const coverageScore =
    Math.min(1, sample.length / (horizon.minimumObservations * 3)) * 0.35 +
    Math.min(1, lookbackMs / horizon.preferredHistoryMs) * 0.65;
  const coverage: PriceForecastCoverage =
    coverageScore >= 0.75
      ? "broad"
      : coverageScore >= 0.45
        ? "limited"
        : "thin";

  return {
    id: horizon.id,
    label: horizon.label,
    asOf,
    current,
    lower: current * Math.exp(centerLogReturn - bandLogReturn),
    center: current * Math.exp(centerLogReturn),
    upper: current * Math.exp(centerLogReturn + bandLogReturn),
    horizonMs: horizon.horizonMs,
    lookbackMs,
    observations: sample.length,
    centerChangePct: (Math.exp(centerLogReturn) - 1) * 100,
    observedTrendPct: (Math.exp(dailyDrift * horizonDays) - 1) * 100,
    dailyVolatilityPct: realizedDailyVolatility * 100,
    volatilityFloorApplied: realizedDailyVolatility < DAILY_VOLATILITY_FLOOR,
    rangePct: (Math.exp(bandLogReturn) - 1) * 100,
    direction,
    coverage,
  };
}

/**
 * Produces explicit, price-history-only forecasts for the supplied horizons.
 * The calculation intentionally has no live chain-metric weights: those need
 * aligned history and out-of-sample validation before they can enter a model.
 */
export function computePriceForecasts(
  rawPoints: PricePoint[],
  horizonIds: readonly PriceForecastHorizonId[] = PRICE_FORECAST_HORIZONS.map(
    (horizon) => horizon.id,
  ),
): PriceForecast[] {
  const selected = new Set(horizonIds);
  const points = cleanPoints(rawPoints);

  return PRICE_FORECAST_HORIZONS.flatMap((horizon) => {
    if (!selected.has(horizon.id)) return [];
    const forecast = calculateForecast(points, horizon);
    return forecast ? [forecast] : [];
  });
}
