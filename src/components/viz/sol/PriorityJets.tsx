"use client";

import { useId, useMemo, useState } from "react";
import { DialCanvas, DialStageReadout, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { decadeBounds, logFraction } from "@/lib/dial-geometry";
import { formatFee, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

const FLOOR = 182;
const TOP = 46;
const LEFT = 46;
const RIGHT = 294;
const UNIT = "µLamports/CU";

function compactFee(v: number) {
  if (v >= 1e6) return `${+(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${+(v / 1e3).toFixed(1)}k`;
  return `${+v.toFixed(v < 10 ? 1 : 0)}`;
}

/**
 * Prioritization fee samples as jets on a logarithmic scale: samples span
 * several decades, so a linear axis would flatten everything but the top one.
 */
export function PriorityJets({ large = false, compact = false, stage = false }: DialProps) {
  const txs = useDashboardStore((s) => s.live.recentTxs);
  const p90 = useDashboardStore((s) => s.live.feeFastest);
  const p50 = useDashboardStore((s) => s.live.feeHalfHour);
  const count = useDashboardStore((s) => s.live.mempoolCount);
  const uid = useId().replace(/:/g, "");
  const [picked, setPicked] = useState<number | null>(null);

  const samples = useMemo(() => txs.map((t) => t.feeRate).filter((v) => Number.isFinite(v) && v >= 0).slice(0, compact ? 12 : 24), [txs, compact]);
  const refs = [p50, p90].filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
  const { min, max } = decadeBounds([...samples, ...refs]);
  const y = (v: number) => FLOOR - logFraction(Math.max(v, min), min, max) * (FLOOR - TOP);
  const decades = Array.from({ length: Math.round(Math.log10(max / min)) + 1 }, (_, i) => min * 10 ** i);
  const step = samples.length ? (RIGHT - LEFT - 12) / samples.length : 0;
  const p90Known = p90 != null && Number.isFinite(p90);
  const reading = p90Known ? formatFee(p90, UNIT) : "Awaiting fee samples";
  const pickedFee = picked != null ? samples[picked] : undefined;

  const art = <DialCanvas {...{ large, compact, stage }} wide label={`Priority jets. ${samples.length} prioritization fee samples on a logarithmic scale. p90 ${formatFee(p90, UNIT)}, p50 ${formatFee(p50, UNIT)}.`}>
    <defs>
      <linearGradient id={`${uid}-chamber`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#14242a" /><stop offset=".6" stopColor="#070d12" /><stop offset="1" stopColor="#12212a" /></linearGradient>
      <linearGradient id={`${uid}-jet`} x1="0" y1="1" x2="0" y2="0"><stop stopColor="#f4fffa" /><stop offset=".18" stopColor="var(--accent)" /><stop offset=".8" stopColor="var(--accent)" stopOpacity=".35" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient>
      <linearGradient id={`${uid}-pipe`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a9b8cc" stopOpacity=".7" /><stop offset=".35" stopColor="#1d2a38" /><stop offset="1" stopColor="#070c12" /></linearGradient>
      <radialGradient id={`${uid}-glow`} cy="100%" r="60%"><stop stopColor="var(--accent)" stopOpacity=".22" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
    </defs>
    <path d="M17 18 H303 L314 29 V204 L301 219 H19 L6 206 V29 Z" fill={`url(#${uid}-chamber)`} stroke="#7a8fac" strokeOpacity=".35" strokeWidth=".7" />
    <path d="M19 22 H301 M10 33 V198 M19 215 H299" fill="none" stroke="#e1ebff" strokeOpacity=".14" strokeWidth=".6" />
    <rect x={LEFT} y={TOP + 40} width={RIGHT - LEFT} height={FLOOR - TOP - 40} fill={`url(#${uid}-glow)`} />
    <text x="25" y="37" className="dial-tiny">PRIORITY JETS</text>
    <text x="294" y="37" textAnchor="end" className="dial-tiny">LOG · µLAMPORTS/CU</text>

    {decades.map((d) => <g key={d}>
      <path d={`M${LEFT} ${y(d)} H${RIGHT}`} stroke="#7890b8" strokeOpacity=".16" strokeWidth=".5" strokeDasharray="2 4" />
      <text x={LEFT - 4} y={y(d) + 2} textAnchor="end" className="dial-tiny" opacity=".8">{compactFee(d)}</text>
    </g>)}

    {samples.map((fee, i) => {
      const x = LEFT + 6 + step * (i + 0.5);
      const top = y(fee);
      const w = Math.min(6.5, step * 0.36);
      const active = picked === i;
      return <g key={i} data-jet className="cursor-pointer" onClick={(event) => { event.stopPropagation(); setPicked(active ? null : i); }}>
        <rect x={x - step / 2} y={TOP} width={step} height={FLOOR - TOP} fill="transparent" />
        <path d={`M${x - w} ${FLOOR - 3} C${x - w * .7} ${FLOOR - 20} ${x - 1} ${top + 12} ${x} ${top} C${x + 1} ${top + 12} ${x + w * .7} ${FLOOR - 20} ${x + w} ${FLOOR - 3}Z`} fill={`url(#${uid}-jet)`} opacity={active ? 1 : .82} />
        <path d={`M${x} ${FLOOR - 4} V${top + 6}`} stroke="#f4fffa" strokeOpacity={active ? .95 : .55} strokeWidth=".6" />
        <circle cx={x} cy={top} r={active ? 2.4 : 1.4} fill="#f4fffa" />
        <rect x={x - 3.5} y={FLOOR - 3} width="7" height="5" rx="1" fill={`url(#${uid}-pipe)`} stroke="#c3cede" strokeOpacity=".25" strokeWidth=".4" />
      </g>;
    })}

    <rect x={LEFT} y={FLOOR + 2} width={RIGHT - LEFT} height="6" rx="3" fill={`url(#${uid}-pipe)`} stroke="#c3cede" strokeOpacity=".25" strokeWidth=".5" />

    {[{ v: p90, k: "P90", dash: "5 3", dy: -2.5 }, { v: p50, k: "P50", dash: "1.5 3", dy: 6.5 }].map(({ v, k, dash, dy }) => v != null && Number.isFinite(v) && v > 0
      ? <g key={k}><path d={`M${LEFT} ${y(v)} H${RIGHT}`} stroke="#e8fff5" strokeOpacity=".55" strokeWidth=".6" strokeDasharray={dash} /><text x={RIGHT + 3} y={y(v) + dy} className="dial-tiny" fill="#e8fff5">{k}</text></g>
      : null)}

    {!samples.length && <text x="170" y="118" textAnchor="middle" className="dial-label">AWAITING FEE SAMPLES</text>}
    <text x="25" y="206" className="dial-tiny">{pickedFee != null ? `SAMPLE ${compactFee(pickedFee)} µLAMPORTS/CU` : "SELECT A JET"}</text>
    <text x="293" y="206" textAnchor="end" className="dial-tiny">RECENT SLOTS →</text>
  </DialCanvas>;

  const body = <div className="contents" onClick={(event) => { if (stage && picked != null) { event.stopPropagation(); setPicked(null); } }}>{art}</div>;
  if (compact) return body;
  if (stage) return <DialStageReadout reading={reading} detail={`p90 of recent prioritization fees · p50 ${formatFee(p50, UNIT)}${count != null ? ` · ${formatInteger(count)} samples` : ""} · Logarithmic scale`}>{body}</DialStageReadout>;
  return <InstrumentFrame title="Jets" subtitle="Prioritization fee samples · log scale · jet = select" reading={reading} large={large} instrumentId="atmosphere">{body}</InstrumentFrame>;
}
