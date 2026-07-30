"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatHash, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

function hashToTiles(hash: string, n: number) {
  const h = hash.replace(/^0x/i, "").padEnd(64, "0");
  return Array.from({ length: n }, (_, i) => {
    const slice = h.slice((i * 2) % 60, (i * 2) % 60 + 4) || "00";
    const v = Number.parseInt(slice, 16) || i * 17;
    const hue = 220 + (v % 40);
    const lit = 42 + (v % 30);
    return {
      i,
      color: `hsl(${hue} 55% ${lit}%)`,
      accent: v % 7 === 0,
    };
  });
}

export function BlockMosaic({
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

  const cols = compact ? 4 : stage ? 8 : 6;
  const tiles = useMemo(
    () => hashToTiles(tipHash ?? "0", cols * cols),
    [tipHash, cols],
  );

  const copy = useCallback(
    async (e?: MouseEvent) => {
      e?.stopPropagation();
      if (!tipHash) return;
      try {
        await navigator.clipboard.writeText(tipHash);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      } catch {
        // ignore
      }
    },
    [tipHash],
  );

  const size = stage ? 280 : large ? 168 : compact ? 72 : 128;

  const mosaic = tipHash ? (
    <button
      type="button"
      onClick={copy}
      className="relative overflow-hidden rounded-[12px] border border-line-strong outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{ width: size, height: size }}
      aria-label="Block mosaic. Click to copy tip hash."
      title="Click to copy tip hash"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${tipHash}-${boardPulse}`}
          className="grid h-full w-full"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {tiles.map((t) => (
            <div
              key={t.i}
              style={{
                background: t.accent ? "var(--accent)" : t.color,
                opacity: t.accent ? 0.9 : 0.85,
              }}
            />
          ))}
        </motion.div>
      </AnimatePresence>
      {!reduce && boardPulse > 0 && (
        <motion.span
          key={boardPulse}
          className="pointer-events-none absolute inset-0 border-2 border-accent"
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      )}
    </button>
  ) : (
    <div
      className="flex items-center justify-center rounded-[12px] border border-dashed border-line bg-ink"
      style={{ width: size, height: size }}
    >
      <p className="mono text-[10px] uppercase tracking-wider text-paper-muted">
        Waiting for tip
      </p>
    </div>
  );

  if (compact) return mosaic;
  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {mosaic}
        <p className="mono text-lg text-paper md:text-2xl">
          {copied ? "Got it, on your clipboard" : formatHash(tipHash)}
        </p>
        {height != null && (
          <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
            Block {formatInteger(height)}
          </p>
        )}
        <p className="text-xs text-paper-muted">Click mosaic to copy full hash</p>
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Mosaic"
      subtitle={
        height != null
          ? `Block ${formatInteger(height)} as stained glass`
          : "Tip hash as stained glass"
      }
      reading={copied ? "Copied" : formatHash(tipHash)}
      large={large}
      instrumentId="sigil"
    >
      {mosaic}
    </InstrumentFrame>
  );
}
