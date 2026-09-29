"use client";

import { useId } from "react";
import { DialBezel, DialCanvas, DialStageReadout, polar, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { useDashboardStore } from "@/lib/store";

const nodes = Array.from({ length: 64 }, (_, i) => {
  const y = 1 - i / 63 * 2;
  const radius = Math.sqrt(1 - y * y);
  const angle = i * Math.PI * (3 - Math.sqrt(5));
  return { x: 120 + Math.cos(angle) * radius * 66, y: 119 + y * 62, z: Math.sin(angle) * radius };
});
const links = nodes.flatMap((a, i) => nodes.slice(i + 1).flatMap((b) => Math.hypot(a.x - b.x, a.y - b.y) < 24 && Math.abs(a.z - b.z) < .65 ? [{ a, b }] : []));

export function ValidatorConstellation({ large = false, compact = false, stage = false }: DialProps) {
  const score = useDashboardStore((s) => s.live.securityScore);
  const label = useDashboardStore((s) => s.live.forgeLabel);
  const epoch = useDashboardStore((s) => s.live.retargetProgress);
  const uid = useId().replace(/:/g, "");
  const known = score != null && Number.isFinite(score);
  const strength = known ? Math.max(0, Math.min(1, score)) : 0;
  const proxy = label?.includes("gas used") ?? false;
  const reading = label ?? "Awaiting security data";
  const orbit = epoch != null && Number.isFinite(epoch) ? polar(90, Math.max(0, Math.min(100, epoch)) * 3.6) : null;
  const art = <DialCanvas {...{ large, compact, stage }} label={`Validator constellation. ${reading}. ${proxy ? "Gas utilization is a fallback, not a stake measurement." : "Nodes are an illustration, not individual validators."}`}>
    <defs><radialGradient id={`${uid}-nebula`}><stop stopColor="var(--accent)" stopOpacity=".32" /><stop offset=".5" stopColor="var(--accent)" stopOpacity=".08" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></radialGradient></defs>
    <DialBezel ticks={48}>
      <circle cx="120" cy="119" r="76" fill={`url(#${uid}-nebula)`} />
      <g fill="none" stroke="#97b5f4" strokeWidth=".5" opacity=".23">
        <ellipse cx="120" cy="119" rx="70" ry="25" transform="rotate(-28 120 119)" />
        <ellipse cx="120" cy="119" rx="35" ry="65" transform="rotate(24 120 119)" />
        <ellipse cx="120" cy="119" rx="65" ry="65" />
        <ellipse cx="120" cy="119" rx="70" ry="14" transform="rotate(30 120 119)" />
      </g>
      {known && <g>
        {links.map(({ a, b }, i) => <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#9cb8ff" strokeWidth=".55" opacity={.08 + (a.z + 1) * .11 * strength} />)}
        {nodes.map((node, i) => <g key={i} opacity={.25 + (node.z + 1) * .32}>
          {node.z > .4 && <circle cx={node.x} cy={node.y} r={3 + strength * 2} fill="var(--accent)" opacity=".18" />}
          <circle cx={node.x} cy={node.y} r={.6 + (node.z + 1) * .65 + strength * .35} fill={i % 4 ? "#d6e4ff" : "#83b0ff"} />
        </g>)}
      </g>}
      <circle cx="120" cy="120" r="90" fill="none" stroke="var(--accent)" strokeOpacity=".3" strokeWidth=".5" strokeDasharray="1 4" />
      {orbit && <g><circle cx={orbit.x} cy={orbit.y} r="6" fill="var(--accent)" opacity=".18" /><circle cx={orbit.x} cy={orbit.y} r="2.5" fill="#d8e6ff" className="dial-signal" /></g>}
      <text x="120" y="44" textAnchor="middle" className="dial-tiny">{proxy ? "UTILIZATION PROXY" : "CONSENSUS FIELD"}</text>
      <text x="120" y="198" textAnchor="middle" className="dial-tiny">{epoch != null ? `EPOCH ${epoch.toFixed(0)}%` : "EPOCH UNAVAILABLE"}</text>
      {!known && <text x="120" y="123" textAnchor="middle" className="dial-tiny">AWAITING DATA</text>}
    </DialBezel>
  </DialCanvas>;
  if (compact) return art;
  if (stage) return <DialStageReadout reading={reading} detail={proxy ? "Gas-used fallback · Stake data unavailable · Orbit marks epoch progress" : "Illustrated network field · Brightness follows the reported security reading"}>{art}</DialStageReadout>;
  return <InstrumentFrame title="Sky" subtitle={proxy ? "Gas-used proxy · stake feed unavailable" : "Network field · orbit marks epoch progress"} reading={reading} large={large} instrumentId="forge">{art}</InstrumentFrame>;
}
