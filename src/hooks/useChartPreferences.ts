"use client";
import { useEffect, useState } from "react";
import { parseChartPreferences, type ChartPreferences } from "@/lib/price/preferences";
import type { ChainId } from "@/lib/chains/types";
import type { PriceRangeId } from "@/lib/price/types";

export function useChartPreferences(chainId: ChainId, defaultRange: PriceRangeId) {
  const key = `chain-dials:chart:${chainId}:v1`;
  const [stored, setStored] = useState<{ key: string; value: Partial<ChartPreferences> } | null>(null);
  useEffect(() => {
    const load = () => {
      try { setStored({ key, value: parseChartPreferences(JSON.parse(localStorage.getItem(key) ?? "{}")) }); }
      catch { setStored({ key, value: {} }); }
    };
    const timer = setTimeout(load, 0);
    const sync = (event: StorageEvent) => { if (event.key === key || event.key === null) load(); };
    window.addEventListener("storage", sync);
    return () => { clearTimeout(timer); window.removeEventListener("storage", sync); };
  }, [key]);
  const value = stored?.key === key ? stored.value : {};
  const preferences: ChartPreferences = { range: value.range ?? defaultRange, mode: value.mode ?? "line" };
  const update = (patch: Partial<ChartPreferences>) => {
    const next = { ...preferences, ...patch };
    setStored({ key, value: next });
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* usable for this visit */ }
  };
  return { ...preferences, update, ready: stored?.key === key };
}
