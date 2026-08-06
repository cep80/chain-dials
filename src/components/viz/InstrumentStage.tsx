"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
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
import {
  INSTRUMENT_META,
  INSTRUMENT_ORDER,
  type InstrumentId,
} from "@/lib/instruments";
import { useChainOptional } from "@/lib/chains/context";
import { ShareBar } from "@/components/share/ShareBar";
import { useDashboardStore } from "@/lib/store";
import {
  formatDuration,
  formatFee,
  formatHash,
  formatPlainPercent,
} from "@/lib/format";

const CHROME_IDLE_MS = 2800;

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
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function FullscreenIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M9 3v6H3M15 3v6h6M9 21v-6H3M21 15v6h-6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M9 3H3v6M15 3h6v6M9 21H3v-6M21 15v6h-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InstrumentStage() {
  const active = useInstrumentStage((s) => s.active);
  const close = useInstrumentStage((s) => s.close);
  const next = useInstrumentStage((s) => s.next);
  const prev = useInstrumentStage((s) => s.prev);
  const reduce = useAppReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [browserFs, setBrowserFs] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const canPortal = typeof document !== "undefined";

  const bumpChrome = useCallback(() => {
    setChromeVisible(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setChromeVisible(false);
    }, CHROME_IDLE_MS);
  }, []);

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
    bumpChrome();
    return () => {
      document.body.style.overflow = prevOverflow;
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [active, bumpChrome]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      bumpChrome();
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
  }, [active, bumpChrome, close, next, prev, toggleBrowserFullscreen]);

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
      return live.mempoolCount != null
        ? String(live.mempoolCount)
        : formatFee(live.feeFastest, "sat/vB");
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
    if (active === "forge")
      return (
        live.forgeLabel ??
        formatPlainPercent(
          live.securityScore != null ? live.securityScore * 100 : null,
          0,
        )
      );
    return null;
  })();

  if (!canPortal) return null;

  const chromeOpacity = chromeVisible || reduce ? 1 : 0;

  return createPortal(
    <AnimatePresence>
      {active && meta && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="instrument-stage-panel instrument-stage-clean relative flex h-full w-full flex-col outline-none"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            onPointerMove={bumpChrome}
            onClick={bumpChrome}
          >
            <header
              className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] transition-opacity duration-500 md:px-8 md:pt-6"
              style={{ opacity: chromeOpacity }}
            >
              <div className="pointer-events-auto min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
                  {stageIndex}/{stageCount}
                  {frameTitle ? ` · ${frameTitle}` : ""}
                </p>
                <h2
                  id={titleId}
                  className="mt-1 text-xl font-bold tracking-tight text-paper md:text-3xl"
                >
                  {meta.title}
                </h2>
                {stageReading ? (
                  <p className="instrument-stage-reading mono mt-1 text-sm text-paper-muted md:text-base">
                    {stageReading}
                  </p>
                ) : null}
              </div>
              <div className="pointer-events-auto flex shrink-0 items-center gap-2">
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
                  className="rounded-lg border border-line/70 bg-ink/50 px-3 py-2 text-paper-muted backdrop-blur-sm transition hover:border-accent hover:text-accent"
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
                  className="rounded-lg border border-line/70 bg-ink/50 px-3 py-2 text-paper-muted backdrop-blur-sm transition hover:border-accent hover:text-paper"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </header>

            <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-16 md:px-10 md:py-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="flex w-full max-w-[min(96vw,1100px)] flex-col items-center"
                  initial={reduce ? false : { opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <StageBody id={active} />
                </motion.div>
              </AnimatePresence>

              <div
                className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-between px-3 transition-opacity duration-500 md:flex md:px-4"
                style={{ opacity: chromeOpacity }}
              >
                <button
                  type="button"
                  onClick={prev}
                  className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-line/60 bg-ink/55 text-paper-muted backdrop-blur-sm transition hover:border-accent hover:text-accent"
                  aria-label="Previous instrument"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden
                  >
                    <path
                      d="M15 6l-6 6 6 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-line/60 bg-ink/55 text-paper-muted backdrop-blur-sm transition hover:border-accent hover:text-accent"
                  aria-label="Next instrument"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <footer
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 transition-opacity duration-500 md:px-8"
              style={{ opacity: chromeOpacity }}
            >
              <p className="text-[11px] text-paper-muted">
                <kbd className="mono rounded border border-line/70 px-1.5 py-0.5 text-paper">
                  Esc
                </kbd>{" "}
                close ·{" "}
                <kbd className="mono rounded border border-line/70 px-1.5 py-0.5 text-paper">
                  ←
                </kbd>{" "}
                <kbd className="mono rounded border border-line/70 px-1.5 py-0.5 text-paper">
                  →
                </kbd>{" "}
                switch ·{" "}
                <kbd className="mono rounded border border-line/70 px-1.5 py-0.5 text-paper">
                  F
                </kbd>{" "}
                fill screen
              </p>
              <div className="pointer-events-auto flex gap-2 md:hidden">
                <button
                  type="button"
                  onClick={prev}
                  className="rounded-full border border-line/70 bg-ink/50 px-3 py-1.5 text-xs text-paper-muted"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="rounded-full border border-line/70 bg-ink/50 px-3 py-1.5 text-xs text-paper-muted"
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
