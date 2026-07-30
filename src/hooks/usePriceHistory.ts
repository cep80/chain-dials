"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChainId } from "@/lib/chains/types";
import type { PriceHistoryPayload, PriceRangeId } from "@/lib/price/types";

interface State {
  data: PriceHistoryPayload | null;
  loading: boolean;
  error: string | null;
}

export function usePriceHistory(chainId: ChainId, range: PriceRangeId) {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);
  const genRef = useRef(0);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const gen = ++genRef.current;

    setState((s) => ({
      ...s,
      loading: true,
      error: null,
      // Keep previous series visible while swapping ranges
      data: s.data?.chain === chainId ? s.data : null,
    }));

    try {
      const res = await fetch(
        `/api/suite/price-history?chain=${chainId}&range=${range}`,
        { cache: "no-store", signal: ac.signal },
      );
      const body = (await res.json()) as PriceHistoryPayload & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      if (gen !== genRef.current) return;
      setState({ data: body, loading: false, error: null });
    } catch (e) {
      if (ac.signal.aborted) return;
      if (gen !== genRef.current) return;
      setState((s) => ({
        data: s.data,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load history",
      }));
    }
  }, [chainId, range]);

  useEffect(() => {
    void load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  return { ...state, reload: load };
}
