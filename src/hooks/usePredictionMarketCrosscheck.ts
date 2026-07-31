"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChainId } from "@/lib/chains/types";
import type { PredictionMarketCrosscheck } from "@/lib/prediction-markets/types";

interface State {
  data: PredictionMarketCrosscheck | null;
  loading: boolean;
  error: string | null;
}

export function usePredictionMarketCrosscheck(chain: ChainId) {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const reload = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = ++generationRef.current;
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await fetch(`/api/suite/prediction-markets/${chain}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const body = (await response.json()) as PredictionMarketCrosscheck & {
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      if (generation !== generationRef.current) return;
      setState({ data: body, loading: false, error: null });
    } catch (error) {
      if (controller.signal.aborted || generation !== generationRef.current) return;
      setState((current) => ({
        data: current.data,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Prediction-market comparison failed",
      }));
    }
  }, [chain]);

  useEffect(() => {
    void reload();
    return () => abortRef.current?.abort();
  }, [reload]);

  return { ...state, reload };
}
