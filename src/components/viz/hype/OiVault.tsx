"use client";

import { useId } from "react";
import { DialBezel, DialCanvas, DialStageReadout, dialArc, polar, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { LIGHT_RIG } from "@/lib/dial-light";
import { formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

/** One bar per $1B of open interest; the window holds twelve. */
const ROWS = [4, 4, 4];
const BAR_W = 18;
const BAR_H = 10;
const CAPACITY = ROWS.reduce((a, b) => a + b, 0);

/** The HYPE adapter prints open interest in its label ("$4.2B OI · …"); the score is a clamped proxy. */
export function parseOiBillions(label: string | null): number | null {
  const match = label?.match(/\$([\d.]+)B OI/);
  if (!match) return null;
  const value = Number.parseFloat(match[1]!);
  return Number.isFinite(value) ? value : null;
}

function slots() {
  const out: Array<{ x: number; y: number }> = [];
  ROWS.forEach((count, row) => {
    const y = 150 - row * (BAR_H + 3.4);
    const start = 120 - (count * (BAR_W + 2.4) - 2.4) / 2;
    for (let i = 0; i < count; i++) out.push({ x: start + i * (BAR_W + 2.4), y });
  });
  return out;
}
const SLOTS = slots();

export function OiVault({ large = false, compact = false, stage = false }: DialProps) {
  const label = useDashboardStore((s) => s.live.forgeLabel);
  const gas = useDashboardStore((s) => s.live.mempoolPressure);
  const uid = useId().replace(/:/g, "");
  const oi = parseOiBillions(label);
  const known = oi != null;
  const bars = known ? Math.min(CAPACITY, oi) : 0;
  const gasKnown = gas != null && Number.isFinite(gas);
  const gasEnd = gasKnown ? Math.max(0.5, Math.min(100, gas)) * 3.6 : 0;
  const reading = known ? `OI $${oi.toFixed(1)}B` : "Awaiting open interest";
  const rim = LIGHT_RIG.rim;

  const art = <DialCanvas {...{ large, compact, stage }} label={`Open interest vault. ${reading}. Each bar is one billion dollars.${gasKnown ? ` Outer arc: HyperEVM gas ${gas.toFixed(0)} percent full.` : ""}`}>
    <defs>
      <linearGradient id={`${uid}-door`} x1={rim.x1} y1={rim.y1} x2={rim.x2} y2={rim.y2}><stop stopColor="#5b6b82" /><stop offset=".3" stopColor="#1c2635" /><stop offset=".7" stopColor="#0b121c" /><stop offset="1" stopColor="#334257" /></linearGradient>
      <linearGradient id={`${uid}-window`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--accent)" stopOpacity=".14" /><stop offset=".5" stopColor="#060c12" /><stop offset="1" stopColor="#020407" /></linearGradient>
      <linearGradient id={`${uid}-barTop`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#f3fffb" stopOpacity=".95" /><stop offset="1" stopColor="var(--accent)" /></linearGradient>
      <linearGradient id={`${uid}-barFace`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--accent)" stopOpacity=".9" /><stop offset="1" stopColor="var(--accent-dim)" stopOpacity=".55" /></linearGradient>
      <linearGradient id={`${uid}-bolt`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d4dceb" /><stop offset="1" stopColor="#3a475b" /></linearGradient>
      <clipPath id={`${uid}-clip`}><circle cx="120" cy="120" r="47" /></clipPath>
    </defs>
    <DialBezel ticks={60}>
      {gasKnown && <path d={dialArc(88, 0, gasEnd)} fill="none" stroke="var(--accent)" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />}
      <circle cx="120" cy="120" r="88" fill="none" stroke="var(--accent)" strokeOpacity=".12" strokeWidth="2" />

      {/* hinge */}
      {[-24, 24].map((dy) => <rect key={dy} x="34" y={114 + dy} width="9" height="12" rx="2" fill={`url(#${uid}-door)`} stroke="#c3cede" strokeOpacity=".3" strokeWidth=".5" />)}

      {/* door and bolts */}
      <circle cx="120" cy="122" r="80" fill="#000" opacity=".35" />
      <circle cx="120" cy="120" r="80" fill={`url(#${uid}-door)`} stroke="#c3cede" strokeOpacity=".28" strokeWidth=".7" />
      <circle cx="120" cy="120" r="72" fill="none" stroke="#02050a" strokeWidth="1.6" />
      <circle cx="120" cy="120" r="70.5" fill="none" stroke="#cfdcf0" strokeOpacity=".14" strokeWidth=".6" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = i * 30 + 15;
        const p = polar(76, a);
        return <rect key={i} x={p.x - 2.4} y={p.y - 4} width="4.8" height="8" rx="1.6" fill={`url(#${uid}-bolt)`} transform={`rotate(${a} ${p.x} ${p.y})`} opacity=".85" />;
      })}
      {Array.from({ length: 24 }, (_, i) => {
        const a = polar(66, i * 15);
        const b = polar(62, i * 15);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#9fb0c8" strokeOpacity={i % 6 === 0 ? .6 : .25} strokeWidth=".6" />;
      })}

      {/* window */}
      <circle cx="120" cy="120" r="52" fill="#03070c" stroke="#7d8da5" strokeOpacity=".4" strokeWidth="1.2" />
      <circle cx="120" cy="120" r="47" fill={`url(#${uid}-window)`} />
      <g clipPath={`url(#${uid}-clip)`}>
        <ellipse cx="120" cy="153" rx="42" ry="5" fill="var(--accent)" opacity={known ? .08 + Math.min(1, oi / CAPACITY) * .14 : .03} />
        <path d="M74 150.6 H166" stroke="#8fa2c0" strokeOpacity=".3" strokeWidth=".5" />
        {SLOTS.map((s, i) => {
          const fill = Math.max(0, Math.min(1, bars - i));
          const ghost = <g key={i}>
            <path d={`M${s.x} ${s.y} h${BAR_W} l-2 ${-BAR_H} h${-(BAR_W - 4)}Z`} fill="none" stroke="#8fa2c0" strokeOpacity=".3" strokeWidth=".45" strokeDasharray="1.2 1.6" />
          </g>;
          if (fill <= 0) return ghost;
          const bar = <>
            <path d={`M${s.x} ${s.y} h${BAR_W} l-2 ${-BAR_H} h${-(BAR_W - 4)}Z`} fill={`url(#${uid}-barFace)`} stroke="#eafff8" strokeOpacity=".35" strokeWidth=".4" />
            <path d={`M${s.x + 2} ${s.y - BAR_H} h${BAR_W - 4} l-1.2 -1.8 h${-(BAR_W - 6.4)}Z`} fill={`url(#${uid}-barTop)`} opacity=".9" />
            <path d={`M${s.x + 2.5} ${s.y - 2.6} h${BAR_W - 6}`} stroke="#f6fffc" strokeOpacity=".35" strokeWidth=".5" />
          </>;
          if (fill >= 1) return <g key={i}>{bar}</g>;
          // A part-filled bar is the whole bar cut at the fraction, beside its empty outline.
          return <g key={i}>{ghost}<clipPath id={`${uid}-part`}><rect x={s.x - 1} y={s.y - BAR_H - 3} width={1 + BAR_W * fill} height={BAR_H + 4} /></clipPath><g clipPath={`url(#${uid}-part)`}>{bar}</g></g>;
        })}
        <path d="M86 86 C96 76 112 72 124 73" fill="none" stroke="#eef6ff" strokeOpacity=".2" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      <text x="120" y="91" textAnchor="middle" className="dial-tiny">OPEN INTEREST</text>
      <text x="120" y="162" textAnchor="middle" className="dial-tiny">{known ? (oi > CAPACITY ? `${CAPACITY}+ BARS · $1B EACH` : "1 BAR = $1B") : "AWAITING OI"}</text>
      <text x="120" y="208" textAnchor="middle" className="dial-tiny">{gasKnown ? `GAS ${gas.toFixed(0)}%` : "GAS UNAVAILABLE"}</text>
    </DialBezel>
  </DialCanvas>;

  if (compact) return art;
  if (stage) return <DialStageReadout reading={reading} detail={`One bar per $1B of perp open interest${gasKnown ? ` · Outer arc: HyperEVM gas ${formatPlainPercent(gas, 0)} full` : ""}`}>{art}</DialStageReadout>;
  return <InstrumentFrame title="Vault" subtitle="Open interest in $1B bars · arc = gas" reading={reading} large={large} instrumentId="forge">{art}</InstrumentFrame>;
}
