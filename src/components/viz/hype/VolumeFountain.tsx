"use client";

import { motion } from "framer-motion";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useMemo } from "react";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

export function VolumeFountain({
  large = false,
  compact = false,
  stage = false,
}: {
  large?: boolean;
  compact?: boolean;
  stage?: boolean;
}) {
  const supply = useDashboardStore((s) => s.live.supplyProgress);
  const volumeHeat = useDashboardStore((s) => s.live.issuanceProgress) ?? 40;
  const dayVlmB = useDashboardStore((s) => s.live.inflationRate);
  const label = useDashboardStore((s) => s.live.forgeLabel);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const reduce = useAppReducedMotion();

  const level =
    supply != null ? Math.max(0.12, Math.min(0.88, supply / 100)) : 0.35;
  const spray = Math.max(0.35, Math.min(1.5, volumeHeat / 55));
  const dropCount = Math.round((compact ? 5 : stage ? 14 : 9) * spray);

  const drops = useMemo(
    () =>
      Array.from({ length: dropCount }, (_, i) => ({
        x: 42 + (i % 5) * 4,
        delay: (i % 7) * 0.16,
        speed: 0.8 + (i % 4) * 0.22 * spray,
      })),
    [dropCount, spray],
  );

  const h = stage ? 400 : large ? 190 : compact ? 100 : 154;
  const w = stage ? 240 : large ? 120 : compact ? 64 : 100;

  const reading = dayVlmB != null ? `$${dayVlmB.toFixed(1)}B` : "—";

  const fountain = (
    <div
      className={`relative overflow-hidden rounded-[12px] border border-line/80 bg-ink shadow-[0_0_36px_color-mix(in_oklab,var(--accent)_10%,transparent)] ${
        reduce ? "" : "instrument-live-glow"
      }`}
      style={{ width: w, height: h }}
      role="img"
      aria-label={`Volume fountain. Circulating supply ${supply != null ? `${supply.toFixed(0)} percent of reported max` : "unavailable"}. Day volume ${dayVlmB?.toFixed(1) ?? "unknown"} billion.`}
    >
      <svg viewBox="0 0 100 140" className="h-full w-full">
        <motion.rect
          x={18}
          width={64}
          fill="var(--accent)"
          opacity={0.35}
          initial={false}
          animate={{ y: 140 - level * 70, height: level * 70 }}
          transition={
            reduce ? { duration: 0 } : { type: "spring", stiffness: 40, damping: 18 }
          }
        />
        <rect x={46} y={40} width={8} height={50} fill="var(--line-strong)" rx={2} />
        <ellipse cx={50} cy={40} rx={10} ry={4} fill="var(--accent)" opacity={0.85} />
        {!reduce &&
          drops.map((d, i) => (
            <motion.circle
              key={i}
              cx={d.x}
              r={1.2 + spray * 0.35}
              fill="var(--accent)"
              animate={{
                cy: [42, 42 + 55 + (i % 3) * 6],
                opacity: [0, 0.9, 0],
              }}
              transition={{
                duration: 1.15 / d.speed,
                repeat: Infinity,
                delay: d.delay,
                ease: "easeIn",
              }}
            />
          ))}
        {!reduce && boardPulse > 0 && (
          <motion.circle
            key={boardPulse}
            cx={50}
            cy={100}
            r={8}
            fill="none"
            stroke="var(--accent)"
            initial={{ r: 8, opacity: 0.8 }}
            animate={{ r: 36, opacity: 0 }}
            transition={{ duration: 0.9 }}
          />
        )}
      </svg>
    </div>
  );

  if (compact) return fountain;
  if (stage) {
    return (
      <div className="flex flex-col items-center gap-6">
        {fountain}
        <p className="instrument-stage-reading mono text-5xl font-medium text-paper md:text-7xl">
          {dayVlmB != null ? `$${dayVlmB.toFixed(1)}B` : "—"}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-muted">
          24h notional spray
          {supply != null ? ` · supply ${formatPlainPercent(supply, 1)} of reported max` : " · supply feed unavailable"}
        </p>
        {label ? (
          <p className="max-w-sm text-center text-[11px] text-paper-muted">{label}</p>
        ) : null}
      </div>
    );
  }

  return (
    <InstrumentFrame
      title="Fountain"
      subtitle={
        dayVlmB != null
          ? `${supply != null ? "Reported supply basin" : "Supply feed unavailable"} · spray from $${dayVlmB.toFixed(1)}B/24h`
          : "Reported supply basin · spray = 24h volume"
      }
      reading={reading}
      large={large}
      instrumentId="issuance"
    >
      {fountain}
    </InstrumentFrame>
  );
}
