"use client";

import { useEffect, useState } from "react";
import { DialBezel, DialCanvas, DialStageReadout, dialArc, polar, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useDocumentVisible } from "@/lib/use-document-visible";
import { useDashboardStore } from "@/lib/store";
import { formatDuration, formatInteger } from "@/lib/format";

/** The needle shows observed tip age, not an inferred validator/network health score. */
export function CadenceDial({ large = false, compact = false, stage = false, target, title, noun }: DialProps & { target: number; title: string; noun: string }) {
  const timestamp = useDashboardStore((s) => s.live.tipTimestamp);
  const height = useDashboardStore((s) => s.live.blockHeight);
  const now = useDashboardStore((s) => s.now);
  const reduce = useAppReducedMotion();
  const visible = useDocumentVisible();
  const [clock, setClock] = useState(now);
  useEffect(() => {
    if (reduce || !visible || timestamp == null) return;
    const timer = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(timer);
  }, [reduce, visible, timestamp]);
  const since = timestamp == null ? null : Math.max(0, ((reduce ? now : Math.max(now, clock)) - timestamp) / 1000);
  const reading = formatDuration(since);
  const max = target * 8;
  const progress = since == null ? 0 : Math.min(1, since / max);
  const angle = -130 + progress * 260;
  const tip = polar(66, angle);
  const targetLabel = target < 1 ? `${target * 1000}ms` : `${target}s`;
  const art = <DialCanvas {...{ large, compact, stage }} label={`${title}. ${reading} since ${noun}. Reference cadence ${targetLabel}. Tip age is affected by feed polling.`}>
    <DialBezel ticks={72}>
      <path d={dialArc(85, -130, 130)} fill="none" stroke="#26354b" strokeWidth="5" />
      {since != null && progress > 0 && <>
        <path d={dialArc(85, -130, angle)} fill="none" stroke="var(--accent)" strokeWidth="11" opacity=".1" />
        <path d={dialArc(85, -130, angle)} fill="none" stroke="var(--accent)" strokeWidth="3" />
      </>}
      {Array.from({ length: 9 }, (_, i) => {
        const p = polar(71, -130 + i / 8 * 260);
        return <text key={i} x={p.x} y={p.y + 2} textAnchor="middle" className="dial-tiny">{(max * i / 8).toFixed(target < 1 ? 1 : 0)}</text>;
      })}
      <text x="120" y="94" textAnchor="middle" className="dial-tiny">{noun.toUpperCase()} AGE / S</text>
      <path d="M96 141 H144 M100 144 H140" stroke="var(--accent)" strokeOpacity=".15" strokeWidth=".5" />
      {since != null && <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "120px 120px", transition: reduce || since < .5 ? undefined : "transform 250ms linear" }}>
        <path d="M117 133 L120 55 L123 133Z" fill="#dceaff" />
        <path d="M120 62 V112" stroke="var(--accent)" strokeWidth="1" />
      </g>}
      {since != null && <circle cx={tip.x} cy={tip.y} r="3.5" fill="var(--accent)" opacity=".25" />}
      <circle cx="120" cy="120" r="8" fill="#0c1421" stroke="#657994" strokeWidth="1" />
      <circle cx="120" cy="120" r="3" fill="var(--accent)" />
      <text x="120" y="166" textAnchor="middle" className="dial-label">{reading}</text>
      <text x="120" y="186" textAnchor="middle" className="dial-tiny">{`REFERENCE ${targetLabel.toUpperCase()}`}</text>
      <path d="M98 199 H142" stroke="#a7bddb" strokeWidth="1.2" strokeDasharray="1 3" opacity=".4" />
    </DialBezel>
  </DialCanvas>;
  if (compact) return art;
  if (stage) return <DialStageReadout reading={reading} detail={`Since observed ${noun} · ${targetLabel} reference cadence${height != null ? ` · #${formatInteger(height)}` : ""} · Feed polling affects age`}>{art}</DialStageReadout>;
  return <InstrumentFrame title={title} subtitle={`${targetLabel} reference · observed ${noun} age`} reading={reading} large={large} instrumentId="metronome">{art}</InstrumentFrame>;
}
