"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useId, useMemo, useState, type MouseEvent } from "react";
import { arcPath, buildSigil } from "@/lib/hash-sigil";
import { formatHash, formatInteger } from "@/lib/format";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useDashboardStore } from "@/lib/store";
import {
  instrumentCanvasSize,
  materialStrokeWeight,
  resolveDisplayMode,
} from "@/lib/viz-scale";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";

const SIZE = 120;

export function TipSigil({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const tipHash = useDashboardStore((s) => s.live.tipHash);
  const height = useDashboardStore((s) => s.live.blockHeight);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const reduce = useAppReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [copied, setCopied] = useState(false);

  const geom = useMemo(() => buildSigil(tipHash, SIZE), [tipHash]);
  const mode = resolveDisplayMode({ compact, large, stage });
  const displaySize = instrumentCanvasSize(mode, 128);
  const strokeScale = mode === "stage" ? 2.4 : mode === "large" ? 1.55 : 1.15;
  const ringStroke = materialStrokeWeight(0.45, mode) * 0.35;
  const bloomOpacity = boardPulse > 0 ? 0.55 : 0.22;

  const copy = useCallback(
    async (e?: MouseEvent) => {
      e?.stopPropagation();
      if (!tipHash) return;
      try {
        await navigator.clipboard.writeText(tipHash);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        // ignore
      }
    },
    [tipHash],
  );

  const aria = tipHash
    ? `Tip sigil for block ${height ?? "-"}. Hash ${tipHash}. Click to copy.`
    : "Tip sigil waiting for the next block";

  const glyph = tipHash ? (
    <button
      type="button"
      onClick={copy}
      className={`group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        reduce ? "" : "instrument-live-glow"
      }`}
      style={{ width: displaySize, height: displaySize }}
      aria-label={aria}
      title="Click to copy the tip hash"
    >
      <AnimatePresence mode="wait">
        <motion.svg
          key={geom.seed}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full"
          initial={reduce ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          aria-hidden
        >
          <defs>
            <radialGradient id={`sigil-face-${uid}`} cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="var(--ink-soft)" />
              <stop offset="55%" stopColor="var(--ink)" />
              <stop offset="100%" stopColor="var(--ink)" />
            </radialGradient>
            <radialGradient id={`sigil-bloom-${uid}`} cx="50%" cy="50%" r="50%">
              <stop
                offset="0%"
                stopColor="var(--accent)"
                stopOpacity={bloomOpacity}
              />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </radialGradient>
            <filter
              id={`sigil-soft-${uid}`}
              x="-35%"
              y="-35%"
              width="170%"
              height="170%"
            >
              <feGaussianBlur stdDeviation={stage ? 2.2 : 1.4} result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={SIZE / 2 - 1}
            fill={`url(#sigil-bloom-${uid})`}
            opacity={0.85}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={SIZE / 2 - 3}
            fill={`url(#sigil-face-${uid})`}
            stroke="var(--line-strong)"
            strokeWidth={stage ? 2 : 1.4}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={SIZE / 2 - 3}
            fill="none"
            stroke="var(--paper)"
            strokeWidth={0.6}
            opacity={0.12}
          />

          {/* Static hash geometry: mass for TV, motion only on tip change */}
          <g>
            {geom.rings.map((r, i) => (
              <circle
                key={i}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={r}
                fill="none"
                stroke="var(--line)"
                strokeWidth={Math.max(1, ringStroke)}
                opacity={0.65}
              />
            ))}
            {geom.segments
              .filter((s) => s.type === "line" || s.type === "chord")
              .map((s, i) => (
                <line
                  key={`l-${i}`}
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke={s.accent ? "var(--accent)" : "var(--paper-muted)"}
                  strokeWidth={s.weight * strokeScale}
                  strokeLinecap="round"
                  opacity={s.type === "chord" ? 0.75 : 0.95}
                  filter={s.accent ? `url(#sigil-soft-${uid})` : undefined}
                />
              ))}
            {geom.segments
              .filter((s) => s.type === "arc")
              .map((s, i) =>
                s.r != null && s.start != null && s.end != null ? (
                  <path
                    key={`a-${i}`}
                    d={arcPath(s.x1, s.y1, s.r, s.start, s.end)}
                    fill="none"
                    stroke={s.accent ? "var(--accent)" : "var(--paper-muted)"}
                    strokeWidth={s.weight * strokeScale}
                    strokeLinecap="round"
                    opacity={0.95}
                    filter={s.accent ? `url(#sigil-soft-${uid})` : undefined}
                  />
                ) : null,
              )}
            {geom.segments
              .filter((s) => s.type === "dot")
              .map((s, i) => (
                <circle
                  key={`d-${i}`}
                  cx={s.x1}
                  cy={s.y1}
                  r={(s.r ?? 1.5) * (stage ? 1.7 : large ? 1.35 : 1.15)}
                  fill={s.accent ? "var(--accent)" : "var(--paper-muted)"}
                  filter={s.accent ? `url(#sigil-soft-${uid})` : undefined}
                />
              ))}
          </g>
        </motion.svg>
      </AnimatePresence>

      {!reduce && boardPulse > 0 && (
        <motion.span
          key={`pulse-${boardPulse}`}
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-accent/85"
          initial={{ opacity: 0.95, scale: 0.82 }}
          animate={{ opacity: 0, scale: 1.32 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      )}
      {!stage && (
        <span className="pointer-events-none absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-ink-elevated px-2 py-0.5 text-[9px] text-paper-muted opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          {copied ? "Copied" : formatHash(tipHash)}
        </span>
      )}
    </button>
  ) : (
    <div
      className="flex items-center justify-center rounded-full border border-dashed border-line bg-ink"
      style={{ width: displaySize, height: displaySize }}
      role="img"
      aria-label={aria}
    >
      <p className="mono px-3 text-center text-[10px] uppercase tracking-wider text-paper-muted">
        Tip hasn’t landed yet
      </p>
    </div>
  );

  if (compact) return glyph;

  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {glyph}
        <div className="text-center">
          <p className="instrument-stage-reading mono text-5xl font-medium tracking-tight text-paper md:text-7xl">
            {height != null ? formatInteger(height) : "-"}
          </p>
          <p className="mt-2 mono text-sm text-paper-muted md:text-base">
            {copied ? "Got it, on your clipboard" : formatHash(tipHash)}
          </p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-paper-muted/80">
            Tip height · click glyph to copy hash
          </p>
        </div>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Tip Sigil"
      subtitle={
        height != null
          ? `Block ${formatInteger(height)} tip glyph`
          : "Glyph from the tip hash"
      }
      reading={copied ? "Copied" : formatHash(tipHash)}
      large={large}
      instrumentId="sigil"
    >
      {glyph}
    </InstrumentFrame>
  );
}
