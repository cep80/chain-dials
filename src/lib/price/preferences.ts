import { PRICE_RANGE_ORDER, type PriceRangeId } from "@/lib/price/types";

export interface ChartPreferences { range: PriceRangeId; mode: "line" | "candle" }
export function parseChartPreferences(raw: unknown): Partial<ChartPreferences> {
  if (!raw || typeof raw !== "object") return {};
  const value = raw as Record<string, unknown>;
  return {
    ...(PRICE_RANGE_ORDER.includes(value.range as PriceRangeId) ? { range: value.range as PriceRangeId } : {}),
    ...(value.mode === "line" || value.mode === "candle" ? { mode: value.mode } : {}),
  };
}
