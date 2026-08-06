"use client";

import { motion } from "framer-motion";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatHash, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

export function HashTape({
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
  const [copied, setCopied] = useState(false);

  const chars = useMemo(() => {
    const h = (tipHash ?? "waiting…………").replace(/\s/g, "");
    return (h + h).slice(0, compact ? 18 : stage ? 48 : 28).split("");
  }, [tipHash, compact, stage]);

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

  const w = stage ? 720 : large ? 280 : compact ? 120 : 200;
  const h = stage ? 128 : large ? 64 : compact ? 36 : 52;

  const tape = (
    <button
      type="button"
      onClick={copy}
      className={`relative overflow-hidden rounded-[12px] border border-line/80 bg-ink outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-[0_0_36px_color-mix(in_oklab,var(--accent)_12%,transparent)] ${
        reduce ? "" : "instrument-live-glow"
      }`}
      style={{ width: w, height: h }}
      aria-label="Hash tape. Click to copy tip hash."
      title="Click to copy tip hash"
    >
      <motion.div
        key={tipHash ?? "empty"}
        className="absolute inset-y-0 flex items-center gap-1 whitespace-nowrap px-2 mono text-accent"
        style={{ fontSize: compact ? 10 : stage ? 24 : 13 }}
        initial={reduce ? false : { x: "30%" }}
        animate={{ x: reduce ? 0 : ["15%", "-45%"] }}
        transition={
          reduce
            ? undefined
            : { duration: 12, repeat: Infinity, ease: "linear" }
        }
      >
        {chars.map((c, i) => (
          <span
            key={`${c}-${i}`}
            className={i % 6 === 0 ? "text-paper" : undefined}
            style={{ opacity: 0.5 + (i % 5) * 0.08 }}
          >
            {c}
          </span>
        ))}
      </motion.div>
      {!reduce && boardPulse > 0 && (
        <motion.span
          key={boardPulse}
          className="pointer-events-none absolute inset-0 bg-accent/25"
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.65 }}
        />
      )}
    </button>
  );

  if (compact) return tape;
  if (stage) {
    return (
      <div className="flex w-full flex-col items-center gap-6">
        {tape}
        <p className="mono text-lg text-paper md:text-2xl">
          {copied ? "Got it, on your clipboard" : formatHash(tipHash)}
        </p>
        {height != null && (
          <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
            Block {formatInteger(height)}
          </p>
        )}
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Tape"
      subtitle={
        height != null
          ? `Block ${formatInteger(height)} ticker print`
          : "Tip hash on exchange tape"
      }
      reading={copied ? "Copied" : formatHash(tipHash)}
      large={large}
      instrumentId="sigil"
    >
      {tape}
    </InstrumentFrame>
  );
}
