"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BlockMetronome } from "@/components/viz/BlockMetronome";
import { HashrateForge } from "@/components/viz/HashrateForge";
import { IssuanceHourglass } from "@/components/viz/IssuanceHourglass";
import { MempoolAtmosphere } from "@/components/viz/MempoolAtmosphere";
import { TipSigil } from "@/components/viz/TipSigil";
import { BaseFeeTide } from "@/components/viz/eth/BaseFeeTide";
import { BlockMosaic } from "@/components/viz/eth/BlockMosaic";
import { BurnCandle } from "@/components/viz/eth/BurnCandle";
import { SlotLattice } from "@/components/viz/eth/SlotLattice";
import { ValidatorConstellation } from "@/components/viz/eth/ValidatorConstellation";
import { ClearingClock } from "@/components/viz/hype/ClearingClock";
import { FundingTide } from "@/components/viz/hype/FundingTide";
import { HashTape } from "@/components/viz/hype/HashTape";
import { OiVault } from "@/components/viz/hype/OiVault";
import { VolumeFountain } from "@/components/viz/hype/VolumeFountain";
import { InflationFountain } from "@/components/viz/sol/InflationFountain";
import { LeaderRibbon } from "@/components/viz/sol/LeaderRibbon";
import { PriorityJets } from "@/components/viz/sol/PriorityJets";
import { StakeReef } from "@/components/viz/sol/StakeReef";
import { TurbineTach } from "@/components/viz/sol/TurbineTach";
import { useInstrumentStage } from "@/lib/instrument-stage";
import { INSTRUMENT_META, INSTRUMENT_ORDER, type InstrumentId } from "@/lib/instruments";
import { useChainOptional } from "@/lib/chains/context";
import { ShareBar } from "@/components/share/ShareBar";
import { useDashboardStore } from "@/lib/store";
import { formatDuration, formatFee, formatHash, formatPlainPercent } from "@/lib/format";

function StageBody({ id }: { id: InstrumentId }) {
  const chain = useChainOptional();
  const c = chain?.id ?? "btc";

  if (c === "eth") {
    switch (id) {
      case "metronome":
        return <SlotLattice stage />;
      case "atmosphere":
        return <BaseFeeTide stage />;
      case "sigil":
        return <BlockMosaic stage />;
      case "issuance":
        return <BurnCandle stage />;
      case "forge":
        return <ValidatorConstellation stage />;
    }
  }

  if (c === "sol") {
    switch (id) {
      case "metronome":
        return <TurbineTach stage />;
      case "atmosphere":
        return <PriorityJets stage />;
      case "sigil":
        return <LeaderRibbon stage />;
      case "issuance":
        return <InflationFountain stage />;
      case "forge":
        return <StakeReef stage />;
    }
  }

  if (c === "hype") {
    switch (id) {
      case "metronome":
        return <ClearingClock stage />;
      case "atmosphere":
        return <FundingTide stage />;
      case "sigil":
        return <HashTape stage />;
      case "issuance":
        return <VolumeFountain stage />;
      case "forge":
        return <OiVault stage />;
    }
  }

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
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        document
          .querySelector<HTMLButtonElement>('[data-share-x="stage"]')
          ?.click();
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

  const chain = useChainOptional();
  const live = useDashboardStore((s) => s.live);
  const now = useDashboardStore((s) => s.now);
  const meta = active
    ? (chain?.instruments[active] ?? INSTRUMENT_META[active])
    : null;
  const stageIndex = active ? INSTRUMENT_ORDER.indexOf(active) + 1 : 0;
  const stageCount = INSTRUMENT_ORDER.length;
  const frameTitle = active
    ? (chain?.instruments[active]?.frameTitle ?? meta?.title)
    : null;

  const stageReading = (() => {
    if (!active || !chain) return null;
    const since =
      live.tipTimestamp != null
        ? formatDuration(Math.max(0, (now - live.tipTimestamp) / 1000))
        : null;
    if (active === "metronome") return since;
    if (active === "atmosphere") {
      if (chain.id === "eth") {
        const base = live.baseFeeSeries[live.baseFeeSeries.length - 1];
        return formatFee(base ?? live.feeFastest, "gwei");
      }
      if (chain.id === "sol") return formatFee(live.feeFastest, "µLamports/CU");
      if (chain.id === "hype") {
        const f = live.baseFeeSeries[live.baseFeeSeries.length - 1];
        if (f == null) return formatFee(live.feeFastest, "gwei");
        const sign = f > 0 ? "+" : "";
        return `${sign}${f.toFixed(2)} bps`;
      }
      return live.mempoolCount != null ? String(live.mempoolCount) : formatFee(live.feeFastest, "sat/vB");
    }
    if (active === "sigil") return formatHash(live.tipHash);
    if (active === "issuance") {
      if (chain.id === "eth") {
        return live.burnEthPerBlock != null
          ? `${live.burnEthPerBlock.toFixed(3)} ETH`
          : formatPlainPercent(live.issuanceProgress, 0);
      }
      if (chain.id === "sol") {
        return live.inflationRate != null
          ? `${live.inflationRate.toFixed(1)}%`
          : formatPlainPercent(live.issuanceProgress, 1);
      }
      if (chain.id === "hype") {
        return live.inflationRate != null
          ? `$${live.inflationRate.toFixed(1)}B`
          : formatPlainPercent(live.issuanceProgress, 0);
      }
      return formatPlainPercent(live.issuanceProgress, 1);
    }
    if (active === "forge") return live.forgeLabel ?? formatPlainPercent(live.securityScore != null ? live.securityScore * 100 : null, 0);
    return null;
  })();

  // Accent-tinted stage wash from CSS vars set by AppShell
  const stageWash =
    "radial-gradient(ellipse 70% 50% at 50% 20%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 55%), var(--ink)";

  if (!canPortal) return null;

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
            className="relative z-[1] m-0 flex h-full w-full flex-col outline-none focus-visible:ring-2 focus-visible:ring-accent md:m-4 md:h-[calc(100%-2rem)] md:max-w-6xl md:rounded-[20px] md:border md:border-line md:bg-ink-elevated"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 12, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            style={{
              background: stageWash,
            }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-4 md:px-8 md:py-5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
                  Up close
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
                {chain && active && (
                  <ShareBar
                    iconOnly
                    dataShare="stage"
                    target={{
                      kind: "instrument",
                      chainId: chain.id,
                      instrument: active,
                      reading: stageReading,
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => void toggleBrowserFullscreen()}
                  className="rounded-lg border border-line px-3 py-2 text-paper-muted transition hover:border-accent hover:text-accent"
                  aria-label={
                    browserFs ? "Exit browser fullscreen" : "Browser fullscreen"
                  }
                  title="Fill the screen (F)"
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
                <span className="mono text-paper">
                  {stageIndex}/{stageCount}
                  {frameTitle ? ` · ${frameTitle}` : ""}
                </span>
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
                  fill the screen
                </span>
                <span>
                  <kbd className="mono rounded border border-line px-1.5 py-0.5 text-paper">
                    S
                  </kbd>{" "}
                  share
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
