"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getChain } from "@/lib/chains/registry";
import type { ChainConfig, ChainId } from "@/lib/chains/types";

const ChainCtx = createContext<ChainConfig | null>(null);

export function ChainProvider({
  chainId,
  children,
}: {
  chainId: ChainId;
  children: ReactNode;
}) {
  const value = useMemo(() => getChain(chainId), [chainId]);
  return <ChainCtx.Provider value={value}>{children}</ChainCtx.Provider>;
}

export function useChain(): ChainConfig {
  const ctx = useContext(ChainCtx);
  if (!ctx) {
    throw new Error("useChain must be used inside ChainProvider");
  }
  return ctx;
}

export function useChainOptional(): ChainConfig | null {
  return useContext(ChainCtx);
}
