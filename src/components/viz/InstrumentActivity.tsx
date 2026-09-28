"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const InstrumentActiveContext = createContext(true);
export const useInstrumentActive = () => useContext(InstrumentActiveContext);

/** Keep readings mounted, but suspend visual motion outside the viewport. */
export function InstrumentActivity({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const sync = () => setVisible(document.visibilityState !== "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false));
    if (ref.current) observer.observe(ref.current);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);
  const active = inView && visible;
  return <div ref={ref} className={`min-w-0 scroll-mt-48 ${className ?? ""}`} data-instrument-active={active ? "true" : "false"}><InstrumentActiveContext.Provider value={active}>{children}</InstrumentActiveContext.Provider></div>;
}
