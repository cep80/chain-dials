"use client";

import { useEffect, useState } from "react";
import { useInstrumentActive } from "@/components/viz/InstrumentActivity";

/** True when the document tab is visible - pause heavy canvas when hidden. */
export function useDocumentVisible(): boolean {
  const active = useInstrumentActive();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return visible && active;
}
