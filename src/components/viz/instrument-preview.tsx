"use client";

import { createContext, useContext, type ReactNode } from "react";

const InstrumentPreviewContext = createContext(false);

/** Marks descendants as a non-interactive dial preview (no expand / tips). */
export function InstrumentPreviewProvider({ children }: { children: ReactNode }) {
  return (
    <InstrumentPreviewContext.Provider value={true}>
      {children}
    </InstrumentPreviewContext.Provider>
  );
}

export function useInstrumentPreview() {
  return useContext(InstrumentPreviewContext);
}
