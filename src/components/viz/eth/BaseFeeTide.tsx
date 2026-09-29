"use client";

import { useId } from "react";
import { DialCanvas, DialStageReadout, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatFee } from "@/lib/format";
import { feePlot } from "@/lib/dial-geometry";
import { useDashboardStore } from "@/lib/store";

export function BaseFeeTide({ large = false, compact = false, stage = false }: DialProps) {
  const base = useDashboardStore((s) => s.live.baseFeeSeries);
  const tips = useDashboardStore((s) => s.live.prioritySeries);
  const uid = useId().replace(/:/g, "");
  const latest = base.at(-1);
  const tip = tips.at(-1);
  const known = latest != null && Number.isFinite(latest) && latest >= 0;
  const ceiling = Math.max(.01, ...base.filter((v) => Number.isFinite(v) && v >= 0), ...tips.filter((v) => Number.isFinite(v) && v >= 0)) * 1.2;
  const waves = feePlot(base, ceiling);
  const tipWaves = feePlot(tips, ceiling);
  const reading = known ? `${formatFee(latest, "gwei")} base` : "Awaiting base fee";
  const art = <DialCanvas {...{ large, compact, stage }} wide label={`Base fee tide. ${reading}. Priority tip ${formatFee(tip, "gwei")}. Lines show reported recent block samples.`}>
    <defs>
      <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a8baff" stopOpacity=".62" /><stop offset=".25" stopColor="var(--accent)" stopOpacity=".55" /><stop offset="1" stopColor="var(--accent)" stopOpacity=".03" /></linearGradient>
      <linearGradient id={`${uid}-chamber`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#17243b" /><stop offset=".6" stopColor="#080e19" /><stop offset="1" stopColor="#15223a" /></linearGradient>
      <clipPath id={`${uid}-clip`}><rect x="20" y="40" width="280" height="143" /></clipPath>
    </defs>
    <path d="M17 18 H303 L314 29 V204 L301 219 H19 L6 206 V29 Z" fill={`url(#${uid}-chamber)`} stroke="#7a8fac" strokeOpacity=".35" strokeWidth=".7" />
    <path d="M19 22 H301 M10 33 V198 M19 215 H299" fill="none" stroke="#e1ebff" strokeOpacity=".16" strokeWidth=".6" />
    <text x="25" y="37" className="dial-tiny">FEE SPECTRUM</text><text x="294" y="37" textAnchor="end" className="dial-tiny">GWEI</text>
    {[0, .25, .5, .75, 1].map((v) => <g key={v}><path d={`M25 ${178 - 126 * v} H295`} stroke="#7890b8" strokeOpacity=".15" strokeWidth=".5" strokeDasharray="2 4" /><text x="28" y={174 - 126 * v} className="dial-tiny" opacity=".7">{(ceiling * v).toFixed(ceiling < 1 ? 3 : 1)}</text></g>)}
    <g clipPath={`url(#${uid}-clip)`}>
      {waves.map((wave, i) => <g key={i}>
        <path d={wave.area} fill={`url(#${uid}-water)`} />
        {[10, 20, 30].map((dy) => <path key={dy} d={wave.line} transform={`translate(0 ${dy})`} fill="none" stroke="var(--accent)" strokeOpacity={.3 - dy / 140} strokeWidth=".7" />)}
        <path d={wave.line} fill="none" stroke="var(--accent)" strokeOpacity=".12" strokeWidth="7" />
        <path d={wave.line} fill="none" stroke="#c4d2ff" strokeWidth="1.4" strokeLinejoin="round" />
      </g>)}
      {tipWaves.map((wave, i) => <path key={i} d={wave.line} fill="none" stroke="#72e0db" strokeWidth="1" strokeDasharray="3 3" opacity=".85" />)}
      {known && <circle cx={base.length === 1 ? 28 : 292} cy={178 - latest / ceiling * 126} r="3" fill="#e2ebff" className="dial-signal" />}
    </g>
    {!waves.length && <text x="160" y="119" textAnchor="middle" className="dial-label">AWAITING FEE SAMPLES</text>}
    <path d="M25 187 H295" stroke="#8598ba" strokeOpacity=".28" strokeWidth=".5" />
    <circle cx="29" cy="201" r="2" fill="#b7c8ff" /><text x="37" y="204" className="dial-tiny">BASE</text>
    <circle cx="84" cy="201" r="2" fill="#72e0db" /><text x="92" y="204" className="dial-tiny">PRIORITY</text>
    <text x="293" y="204" textAnchor="end" className="dial-tiny">RECENT BLOCKS →</text>
  </DialCanvas>;
  if (compact) return art;
  if (stage) return <DialStageReadout reading={reading} detail={`Priority ${formatFee(tip, "gwei")} · Both traces use the same scale`}>{art}</DialStageReadout>;
  return <InstrumentFrame title="Tide" subtitle="Base fee and priority · recent block samples" reading={reading} large={large} instrumentId="atmosphere">{art}</InstrumentFrame>;
}
