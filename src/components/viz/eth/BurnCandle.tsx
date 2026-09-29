"use client";

import { useId } from "react";
import { DialCanvas, DialStageReadout, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { useDashboardStore } from "@/lib/store";

export function BurnCandle({ large = false, compact = false, stage = false }: DialProps) {
  const burn = useDashboardStore((s) => s.live.burnEthPerBlock);
  const uid = useId().replace(/:/g, "");
  const known = burn != null && Number.isFinite(burn) && burn >= 0;
  const intensity = known ? Math.min(1, Math.log10(1 + burn * 100) / 2) : 0;
  const peak = 139 - intensity * 86;
  const label = known ? `${burn < .01 ? burn.toFixed(4) : burn.toFixed(3)} ETH` : "Burn unavailable";
  const art = <DialCanvas {...{ large, compact, stage }} label={`Burn candle. ${label}${known ? " burned in the latest block. Flame height uses a logarithmic scale." : "."}`}>
    <defs>
      <radialGradient id={`${uid}-halo`}><stop stopColor="var(--accent)" stopOpacity={intensity * .45} /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${uid}-plasma`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#bbcaff" stopOpacity=".1" /><stop offset=".35" stopColor="#849cff" /><stop offset=".73" stopColor="#c5e8ff" /><stop offset="1" stopColor="#fafcff" /></linearGradient>
      <linearGradient id={`${uid}-glass`}><stop stopColor="#b9ceff" stopOpacity=".16" /><stop offset=".12" stopColor="#b9ceff" stopOpacity=".03" /><stop offset=".8" stopColor="#b9ceff" stopOpacity=".01" /><stop offset="1" stopColor="#b9ceff" stopOpacity=".18" /></linearGradient>
      <linearGradient id={`${uid}-base`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3e526f" /><stop offset=".24" stopColor="#101d31" /><stop offset=".8" stopColor="#080e18" /><stop offset="1" stopColor="#2b3b55" /></linearGradient>
    </defs>
    <circle cx="120" cy="118" r="102" fill={`url(#${uid}-halo)`} />
    <ellipse cx="120" cy="195" rx="70" ry="10" fill="#000" opacity=".35" />
    <path d="M58 178 L77 168 H163 L182 178 V188 L165 198 H75 L58 188Z" fill={`url(#${uid}-base)`} stroke="#7f93af" strokeOpacity=".4" strokeWidth=".6" />
    <ellipse cx="120" cy="178" rx="57" ry="12" fill="#080e18" stroke="#7b94c0" strokeOpacity=".4" />
    <ellipse cx="120" cy="176" rx="43" ry="8" fill="var(--accent)" opacity={.12 + intensity * .25} />
    <path d="M76 53 V168 C76 185 164 185 164 168 V53" fill={`url(#${uid}-glass)`} stroke="#7d96bd" strokeOpacity=".28" strokeWidth=".65" />
    <ellipse cx="120" cy="53" rx="44" ry="10" fill="#172137" fillOpacity=".15" stroke="#a7bddc" strokeOpacity=".4" strokeWidth=".7" />
    <path d="M83 63 V153 M157 64 V119" stroke="#cedfff" strokeOpacity=".22" strokeWidth="1.4" strokeLinecap="round" />
    {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M176 ${67 + i * 12} h${i % 2 ? 4 : 8}`} stroke="#879cc0" strokeOpacity=".45" strokeWidth=".6" />)}
    <text x="181" y="56" className="dial-tiny">LOG</text>
    {known && burn > 0 && <g className="dial-flame">
      <path d={`M120 ${peak} C141 ${peak + 36} 159 139 143 164 C132 181 104 181 96 164 C81 140 113 ${peak + 37} 120 ${peak}Z`} fill={`url(#${uid}-plasma)`} opacity=".15" />
      <path d={`M120 ${peak + 6} C122 ${peak + 47} 145 133 139 157 C135 181 105 183 102 160 C95 138 118 ${peak + 45} 120 ${peak + 6}Z`} fill={`url(#${uid}-plasma)`} opacity=".85" />
      <path d="M120 129 C127 145 135 153 129 168 C121 179 110 170 111 160 C112 151 119 140 120 129Z" fill="#eefaff" opacity=".85" />
      <path d={`M120 ${peak + 15} C125 ${peak + 48} 145 146 130 169`} fill="none" stroke="#a5b7ff" strokeWidth=".8" />
      {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={103 + i * 7} cy={140 - (i % 3) * 19} r={i % 2 ? .7 : 1.1} fill="#d6eaff" className="dial-ember" style={{ animationDelay: `${-i * .63}s` }} />)}
    </g>}
    {!known && <text x="120" y="121" textAnchor="middle" className="dial-tiny">AWAITING BURN</text>}
    {known && burn === 0 && <text x="120" y="121" textAnchor="middle" className="dial-tiny">NO BURN</text>}
    <text x="120" y="219" textAnchor="middle" className="dial-tiny">EIP-1559 / LAST BLOCK</text>
  </DialCanvas>;
  if (compact) return art;
  if (stage) return <DialStageReadout reading={label} detail="ETH burned in the latest block · Logarithmic flame scale">{art}</DialStageReadout>;
  return <InstrumentFrame title="Candle" subtitle="ETH burned last block · logarithmic flame" reading={label} large={large} instrumentId="issuance">{art}</InstrumentFrame>;
}
