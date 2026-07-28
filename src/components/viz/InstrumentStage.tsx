"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BlockMetronome } from "@/components/viz/BlockMetronome";
import { HashrateForge } from "@/components/viz/HashrateForge";
import { IssuanceHourglass } from "@/components/viz/IssuanceHourglass";
import { MempoolAtmosphere } from "@/components/viz/MempoolAtmosphere";
import { TipSigil } from "@/components/viz/TipSigil";
import { useInstrumentStage } from "@/lib/instrument-stage";
import { INSTRUMENT_META, type InstrumentId } from "@/lib/instruments";

function StageBody({ id }: { id: InstrumentId }) {
  switch (id) {
    case "metronome":
      return <BlockMetronome stage />;
    case "atmosphere":
      return <MempoolAtmosphere stage />;
    case "sigil":
      return <TipSigil stage />;
    case "issuance":
      return <IssuanceHourglass stage />;
    case "forge":
      return <HashrateForge stage />;
  }
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function FullscreenIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M21 15v6h-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M21 15v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InstrumentStage() {
  const active = useInstrumentStage((s) => s.active);
  const close = useInstrumentStage((s) => s.close);
  const next = useInstrumentStage((s) => s.next);
  const prev = useInstrumentStage((s) => s.prev);
  const reduce = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [browserFs, setBrowserFs] = useState(false);
  const canPortal = typeof document !== "undefined";

  const toggleBrowserFullscreen = useCallback(async () => {
    const el = panelRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        } else {
          close();
        }
      } else if (e.key === "ArrowRight" || e.key === "j") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        prev();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void toggleBrowserFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, next, prev, toggleBrowserFullscreen]);

  useEffect(() => {
    const onFs = () => setBrowserFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  if (!canPortal) return null;

  const meta = active ? INSTRUMENT_META[active] : null;

  return createPortal(
    <AnimatePresence>
      {active && meta && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-stretch justify-center"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/85 backdrop-blur-md"
            aria-label="Close instrument stage"
            onClick={close}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative z-[1] m-0 flex h-full w-full flex-col outline-none md:m-4 md:h-[calc(100%-2rem)] md:max-w-6xl md:rounded-[20px] md:border md:border-line md:bg-ink-elevated"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 12, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(247,147,26,0.10), transparent 55%), var(--ink)",
            }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-4 md:px-8 md:py-5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
                  Observatory stage
                </p>
                <h2
                  id={titleId}
                  className="mt-1 text-2xl font-extrabold tracking-tight text-paper md:text-4xl"
                >
                  {meta.title}
                </h2>
                <p className="mt-1 text-sm text-paper-muted md:text-base">
                  {meta.subtitle}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleBrowserFullscreen()}
                  className="rounded-lg border border-line px-3 py-2 text-paper-muted transition hover:border-accent hover:text-accent"
                  aria-label={
                    browserFs ? "Exit browser fullscreen" : "Browser fullscreen"
                  }
                  title="Browser fullscreen (F)"
                >
                  <FullscreenIcon active={browserFs} />
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg border border-line px-3 py-2 text-paper-muted transition hover:border-accent hover:text-paper"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </header>

            <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 md:px-10 md:py-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="flex w-full max-w-4xl flex-col items-center"
                  initial={reduce ? false : { opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <StageBody id={active} />
                  <p className="mt-8 max-w-xl text-center text-sm leading-relaxed text-paper-muted md:text-base">
                    {meta.narrative}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-between px-3 md:flex">
                <button
                  type="button"
                  onClick={prev}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink/70 text-paper-muted backdrop-blur transition hover:border-accent hover:text-accent"
                  aria-label="Previous instrument"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink/70 text-paper-muted backdrop-blur transition hover:border-accent hover:text-accent"
                  aria-label="Next instrument"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-5 py-3 text-[11px] text-paper-muted md:px-8">
              <div className="flex flex-wrap gap-3">
                <span>
                  <kbd className="mono rounded border border-line px-1.5 py-0.5 text-paper">
                    Esc
                  </kbd>{" "}
                  close
                </span>
                <span>
                  <kbd className="mono rounded border border-line px-1.5 py-0.5 text-paper">
                    ←
                  </kbd>{" "}
                  <kbd className="mono rounded border border-line px-1.5 py-0.5 text-paper">
                    →
                  </kbd>{" "}
                  switch
                </span>
                <span>
                  <kbd className="mono rounded border border-line px-1.5 py-0.5 text-paper">
                    F
                  </kbd>{" "}
                  display fullscreen
                </span>
              </div>
              <div className="flex gap-2 md:hidden">
                <button
                  type="button"
                  onClick={prev}
                  className="rounded-full border border-line px-3 py-1.5"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="rounded-full border border-line px-3 py-1.5"
                >
                  Next
                </button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
