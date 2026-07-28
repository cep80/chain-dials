"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { arcPath, buildSigil } from "@/lib/hash-sigil";
import { formatHash, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";
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
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);

  const geom = useMemo(() => buildSigil(tipHash, SIZE), [tipHash]);
  const displaySize = stage ? 280 : large ? 168 : compact ? 72 : 128;

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
    ? `Tip sigil for block ${height ?? "—"}. Hash ${tipHash}. Click to copy.`
    : "Tip sigil waiting for chain tip";

  const glyph = tipHash ? (
    <button
      type="button"
      onClick={copy}
      className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{ width: displaySize, height: displaySize }}
      aria-label={aria}
      title="Click to copy tip hash"
    >
      <AnimatePresence mode="wait">
        <motion.svg
          key={geom.seed}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full"
          initial={reduce ? false : { opacity: 0, rotate: -12, scale: 0.88 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, scale: 1.06, rotate: 6 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          aria-hidden
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={SIZE / 2 - 2}
            fill="var(--ink)"
            stroke="var(--line-strong)"
            strokeWidth={1}
          />

          {/* Slow idle spin of ring + spoke layer */}
          <motion.g
            style={{ transformOrigin: `${SIZE / 2}px ${SIZE / 2}px` }}
            animate={reduce || !tipHash ? undefined : { rotate: 360 }}
            transition={
              reduce || !tipHash
                ? undefined
                : { duration: 90, repeat: Infinity, ease: "linear" }
            }
          >
            {geom.rings.map((r, i) => (
              <circle
                key={i}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={r}
                fill="none"
                stroke="var(--line)"
                strokeWidth={0.6}
                opacity={0.5}
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
                  strokeWidth={s.weight}
                  strokeLinecap="round"
                  opacity={s.type === "chord" ? 0.65 : 0.85}
                />
              ))}
          </motion.g>

          {/* Counter-rotating accent arcs — feels alive between blocks */}
          <motion.g
            style={{ transformOrigin: `${SIZE / 2}px ${SIZE / 2}px` }}
            animate={reduce || !tipHash ? undefined : { rotate: -360 }}
            transition={
              reduce || !tipHash
                ? undefined
                : { duration: 55, repeat: Infinity, ease: "linear" }
            }
          >
            {geom.segments
              .filter((s) => s.type === "arc")
              .map((s, i) =>
                s.r != null && s.start != null && s.end != null ? (
                  <path
                    key={`a-${i}`}
                    d={arcPath(s.x1, s.y1, s.r, s.start, s.end)}
                    fill="none"
                    stroke={s.accent ? "var(--accent)" : "var(--paper-muted)"}
                    strokeWidth={s.weight}
                    strokeLinecap="round"
                    opacity={0.9}
                  />
                ) : null,
              )}
          </motion.g>

          {/* Breathing center dots */}
          <motion.g
            animate={
              reduce || !tipHash
                ? undefined
                : { opacity: [0.65, 1, 0.65], scale: [0.96, 1.04, 0.96] }
            }
            style={{ transformOrigin: `${SIZE / 2}px ${SIZE / 2}px` }}
            transition={
              reduce || !tipHash
                ? undefined
                : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
            }
          >
            {geom.segments
              .filter((s) => s.type === "dot")
              .map((s, i) => (
                <circle
                  key={`d-${i}`}
                  cx={s.x1}
                  cy={s.y1}
                  r={s.r ?? 1.5}
                  fill={s.accent ? "var(--accent)" : "var(--paper-muted)"}
                />
              ))}
          </motion.g>
        </motion.svg>
      </AnimatePresence>

      {!reduce && boardPulse > 0 && (
        <motion.span
          key={`pulse-${boardPulse}`}
          className="pointer-events-none absolute inset-0 rounded-full border border-accent/80"
          initial={{ opacity: 0.9, scale: 0.85 }}
          animate={{ opacity: 0, scale: 1.28 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      )}
      <span className="pointer-events-none absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-ink-elevated px-2 py-0.5 text-[9px] text-paper-muted opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        {copied ? "Copied" : formatHash(tipHash)}
      </span>
    </button>
  ) : (
    <div
      className="flex items-center justify-center rounded-full border border-dashed border-line bg-ink"
      style={{ width: displaySize, height: displaySize }}
      role="img"
      aria-label={aria}
    >
      <p className="mono px-3 text-center text-[10px] uppercase tracking-wider text-paper-muted">
        Waiting for tip
      </p>
    </div>
  );

  if (compact) return glyph;

  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {glyph}
        <div className="text-center">
          <p className="mono text-lg text-paper md:text-2xl">
            {copied ? "Copied to clipboard" : formatHash(tipHash)}
          </p>
          {height != null && (
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-paper-muted">
              Block {formatInteger(height)}
            </p>
          )}
          <p className="mt-3 text-xs text-paper-muted">Click sigil to copy full hash</p>
        </div>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Tip Sigil"
      subtitle={
        height != null
          ? `Block ${formatInteger(height)} fingerprint`
          : "Chain tip fingerprint"
      }
      reading={copied ? "Copied" : formatHash(tipHash)}
      large={large}
      instrumentId="sigil"
    >
      {glyph}
    </InstrumentFrame>
  );
}
