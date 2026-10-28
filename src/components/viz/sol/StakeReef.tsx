"use client";

import { useId, useMemo } from "react";
import { DialBezel, DialCanvas, DialStageReadout, polar, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { coralBranches } from "@/lib/dial-geometry";
import { keyLight } from "@/lib/dial-light";
import { formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

const COLONIES = [
  { x: 64, y: 170, lean: -0.32, size: 22 },
  { x: 90, y: 166, lean: -0.12, size: 30 },
  { x: 121, y: 164, lean: 0.03, size: 36 },
  { x: 151, y: 166, lean: 0.15, size: 29 },
  { x: 177, y: 170, lean: 0.34, size: 21 },
];
const WIDTH = [0.7, 1.15, 1.7, 2.4, 3.2];
const BUBBLES = [{ x: 74, y: 120 }, { x: 108, y: 98 }, { x: 140, y: 110 }, { x: 166, y: 128 }, { x: 126, y: 76 }];
/** Height a full-strength reef reaches (stake score 1 = 400M SOL in the adapter). */
const FULL_TOP = Math.min(...coralBranches(1, COLONIES).map((b) => b.y2));

export function StakeReef({ large = false, compact = false, stage = false }: DialProps) {
  const score = useDashboardStore((s) => s.live.securityScore);
  const label = useDashboardStore((s) => s.live.forgeLabel);
  const epoch = useDashboardStore((s) => s.live.retargetProgress);
  const uid = useId().replace(/:/g, "");
  const light = keyLight();
  const known = score != null && Number.isFinite(score);
  const growth = known ? Math.max(0, Math.min(1, score)) : 0;
  const branches = useMemo(() => known ? coralBranches(growth, COLONIES) : [], [known, growth]);
  const epochKnown = epoch != null && Number.isFinite(epoch);
  const orbit = epochKnown ? polar(89, Math.max(0, Math.min(100, epoch)) * 3.6) : null;
  const reading = label ?? "Awaiting stake data";

  const art = <DialCanvas {...{ large, compact, stage }} label={`Stake reef. ${reading}. Reef height follows total vote stake; the dashed line marks 400 million SOL.${epochKnown ? ` Epoch ${epoch.toFixed(0)} percent.` : ""}`}>
    <defs>
      <radialGradient id={`${uid}-water`} cx={light.cx} cy={light.cy} r="85%"><stop stopColor="var(--accent)" stopOpacity=".2" /><stop offset=".55" stopColor="#06121a" /><stop offset="1" stopColor="#03080d" /></radialGradient>
      <linearGradient id={`${uid}-shaft`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e6fff4" stopOpacity=".12" /><stop offset="1" stopColor="#e6fff4" stopOpacity="0" /></linearGradient>
      <linearGradient id={`${uid}-bed`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1b2a33" /><stop offset=".4" stopColor="#0b141b" /><stop offset="1" stopColor="#04080c" /></linearGradient>
      <clipPath id={`${uid}-port`}><circle cx="120" cy="120" r="101" /></clipPath>
    </defs>
    <DialBezel ticks={48}>
      <g clipPath={`url(#${uid}-port)`}>
        <circle cx="120" cy="120" r="101" fill={`url(#${uid}-water)`} />
        {[0, 1, 2].map((i) => <path key={i} d={`M${30 + i * 26} 18 L${46 + i * 26} 18 L${132 + i * 30} 180 L${108 + i * 30} 180Z`} fill={`url(#${uid}-shaft)`} />)}
        <path d="M14 176 C46 160 76 158 104 160 C136 162 166 158 226 172 V230 H14Z" fill={`url(#${uid}-bed)`} />
        <path d="M14 176 C46 160 76 158 104 160 C136 162 166 158 226 172" fill="none" stroke="#9fd8c0" strokeOpacity=".18" strokeWidth=".6" />
        {[40, 62, 88, 116, 142, 170, 196].map((x, i) => <circle key={x} cx={x} cy={176 + (i % 3) * 5} r=".7" fill="#9fd8c0" opacity=".25" />)}

        <path d={`M44 ${FULL_TOP} H196`} stroke="var(--accent)" strokeOpacity=".35" strokeWidth=".5" strokeDasharray="2 3" />
        <text x="196" y={FULL_TOP - 3} textAnchor="end" className="dial-tiny">400M SOL</text>

        {known && <g strokeLinecap="round">
          {branches.map((b, i) => <line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke="var(--accent)" strokeWidth={WIDTH[b.depth]} strokeOpacity={0.35 + (4 - b.depth) * 0.13} />)}
          {branches.map((b, i) => b.depth > 1 ? <line key={`h${i}`} x1={b.x1 - .5} y1={b.y1} x2={b.x2 - .5} y2={b.y2} stroke="#eafff5" strokeWidth={WIDTH[b.depth] * .28} strokeOpacity=".28" /> : null)}
          {branches.filter((b) => b.tip).map((b, i) => <g key={`t${i}`}>
            <circle cx={b.x2} cy={b.y2} r="2.1" fill="var(--accent)" opacity=".3" />
            <circle cx={b.x2} cy={b.y2} r=".9" fill="#f0fff8" opacity=".9" />
          </g>)}
        </g>}
        {known && BUBBLES.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={i % 2 ? .9 : 1.4} fill="none" stroke="#dffbef" strokeOpacity=".45" strokeWidth=".45" className="dial-ember" style={{ animationDelay: `${-i * .8}s` }} />)}
      </g>
      <circle cx="120" cy="120" r="89" fill="none" stroke="var(--accent)" strokeOpacity=".22" strokeWidth=".5" strokeDasharray="1 4" />
      {orbit && <g><circle cx={orbit.x} cy={orbit.y} r="5.5" fill="var(--accent)" opacity=".2" /><circle cx={orbit.x} cy={orbit.y} r="2.4" fill="#e8fff5" className="dial-signal" /></g>}
      <text x="120" y="44" textAnchor="middle" className="dial-tiny">VOTE STAKE</text>
      <text x="120" y="196" textAnchor="middle" className="dial-tiny">{epochKnown ? `EPOCH ${epoch.toFixed(0)}%` : "EPOCH UNAVAILABLE"}</text>
      {!known && <text x="120" y="122" textAnchor="middle" className="dial-tiny">AWAITING STAKE DATA</text>}
    </DialBezel>
  </DialCanvas>;

  if (compact) return art;
  if (stage) return <DialStageReadout reading={reading} detail={`Reef height follows total vote stake · Dashed line = 400M SOL${epochKnown ? ` · Orbit marks epoch ${formatPlainPercent(epoch, 0)}` : ""}`}>{art}</DialStageReadout>;
  return <InstrumentFrame title="Reef" subtitle="Vote stake as reef · orbit = epoch" reading={reading} large={large} instrumentId="forge">{art}</InstrumentFrame>;
}
