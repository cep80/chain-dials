"use client";

import { useId } from "react";
import { DialBezel, DialCanvas, DialStageReadout, dialArc, polar, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { useChainOptional } from "@/lib/chains/context";
import { LIGHT_RIG } from "@/lib/dial-light";
import { formatHashrate, formatPercent, formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";
import { normalizeHashrate } from "@/lib/viz-scale";

const SEGMENTS = 24;
const ARC_START = -120;
const ARC_END = 120;

/**
 * A crucible under a heat scale. Heat is the single driver: lit segments show
 * hashrate against its recent range, and the melt glows to match. The orbit
 * marks difficulty-epoch progress, tinted by the expected retarget.
 */
export function HashrateForge({ large = false, compact = false, stage = false }: DialProps) {
  const hashrate = useDashboardStore((s) => s.live.hashrate);
  const retargetProgress = useDashboardStore((s) => s.live.retargetProgress);
  const retargetChange = useDashboardStore((s) => s.live.retargetChange);
  const retargetBlocks = useDashboardStore((s) => s.live.retargetBlocks);
  const securityScore = useDashboardStore((s) => s.live.securityScore);
  const forgeLabel = useDashboardStore((s) => s.live.forgeLabel);
  const histories = useDashboardStore((s) => s.histories);
  const chain = useChainOptional();
  const uid = useId().replace(/:/g, "");
  const isPow = !chain || chain.id === "btc";

  const known = isPow ? hashrate != null && Number.isFinite(hashrate) : securityScore != null && Number.isFinite(securityScore);
  const heat = !known ? 0 : isPow ? normalizeHashrate(hashrate, histories.hashrate ?? []) : Math.max(0, Math.min(1, securityScore!));
  const lit = Math.round(heat * SEGMENTS);
  const epochKnown = retargetProgress != null && Number.isFinite(retargetProgress);
  const orbit = epochKnown ? polar(90, Math.max(0, Math.min(100, retargetProgress)) * 3.6) : null;
  const tone = retargetChange == null ? "var(--accent)" : retargetChange >= 0 ? "var(--up)" : "var(--down)";
  const rim = LIGHT_RIG.rim;

  const reading = isPow ? (known ? formatHashrate(hashrate) : "Awaiting hashrate") : (forgeLabel ?? (known ? `${Math.round(heat * 100)}% heat` : "Awaiting data"));
  const aria = isPow
    ? `Hashrate forge. Network hashrate ${formatHashrate(hashrate)}. Heat shows it against the recent range.${epochKnown ? ` Difficulty epoch ${formatPlainPercent(retargetProgress, 1)} complete.` : ""}${retargetChange != null ? ` Estimated retarget ${formatPercent(retargetChange, 1)}.` : ""}`
    : `Security forge. ${reading}.${epochKnown ? ` Epoch ${formatPlainPercent(retargetProgress, 1)} complete.` : ""}`;
  const meltY = 132 - heat * 4;

  const art = <DialCanvas {...{ large, compact, stage }} label={aria}>
    <defs>
      <radialGradient id={`${uid}-glow`} cy="62%"><stop stopColor="var(--accent)" stopOpacity={.08 + heat * .3} /><stop offset=".55" stopColor="var(--accent)" stopOpacity={heat * .08} /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${uid}-melt`} cx="45%" cy="40%" r="70%"><stop stopColor="#fffaf0" stopOpacity={.4 + heat * .6} /><stop offset=".35" stopColor="var(--accent)" /><stop offset="1" stopColor="var(--accent-dim)" stopOpacity=".7" /></radialGradient>
      <linearGradient id={`${uid}-iron`} x1={rim.x1} y1={rim.y1} x2={rim.x2} y2={rim.y2}><stop stopColor="#7d8ca3" /><stop offset=".28" stopColor="#253042" /><stop offset=".72" stopColor="#0c121b" /><stop offset="1" stopColor="#3b4a5f" /></linearGradient>
      <linearGradient id={`${uid}-heat`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="var(--accent-dim)" /><stop offset=".7" stopColor="var(--accent)" /><stop offset="1" stopColor="#fff4e0" /></linearGradient>
    </defs>
    <DialBezel ticks={48}>
      <circle cx="120" cy="128" r="80" fill={`url(#${uid}-glow)`} />

      {/* heat scale */}
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const a0 = ARC_START + (i / SEGMENTS) * (ARC_END - ARC_START) + 1.2;
        const a1 = ARC_START + ((i + 1) / SEGMENTS) * (ARC_END - ARC_START) - 1.2;
        const on = i < lit;
        const t = i / (SEGMENTS - 1);
        return <path key={i} d={dialArc(77, a0, a1)} fill="none" strokeWidth="6" stroke={on ? (t > .85 ? "#fff1d8" : "var(--accent)") : "#1b2534"} strokeOpacity={on ? .45 + t * .55 : 1} />;
      })}
      {[ARC_START, 0, ARC_END].map((a, i) => {
        const p = polar(66, a);
        return <text key={a} x={p.x} y={p.y + 2} textAnchor="middle" className="dial-tiny">{["LOW", "MID", "HIGH"][i]}</text>;
      })}
      <text x="120" y="80" textAnchor="middle" className="dial-tiny">{isPow ? "HEAT VS RECENT RANGE" : "SECURITY HEAT"}</text>

      {/* crucible */}
      <ellipse cx="120" cy="171" rx="40" ry="6" fill="#000" opacity=".4" />
      <path d="M84 128 L92 164 C96 172 144 172 148 164 L156 128Z" fill={`url(#${uid}-iron)`} stroke="#a9b8cc" strokeOpacity=".35" strokeWidth=".6" />
      <path d="M90 136 L96 162" stroke="#e8eef8" strokeOpacity=".2" strokeWidth="1.2" strokeLinecap="round" />
      {[0, 1, 2].map((i) => <path key={i} d={`M${87 + i * .6} ${140 + i * 9} H${153 - i * .6}`} stroke="#000" strokeOpacity=".35" strokeWidth=".7" />)}
      <ellipse cx="120" cy="128" rx="36" ry="7" fill="#05080d" stroke="#c3cede" strokeOpacity=".4" strokeWidth=".7" />
      {known && <>
        <ellipse cx="120" cy={meltY + 1} rx="32" ry="5.6" fill={`url(#${uid}-melt)`} />
        <ellipse cx="114" cy={meltY} rx="12" ry="2" fill="#fffaf0" opacity={.15 + heat * .4} />
        {[0, 1, 2].map((i) => {
          const h = 10 + heat * 26;
          const x = 106 + i * 14;
          return <path key={i} d={`M${x} ${meltY - 4} C${x - 4} ${meltY - 4 - h * .35} ${x + 4} ${meltY - 4 - h * .65} ${x} ${meltY - 4 - h}`} fill="none" stroke="var(--accent)" strokeOpacity={.15 + heat * .25} strokeWidth=".8" strokeLinecap="round" />;
        })}
        {[0, 1, 2, 3].map((i) => <circle key={i} cx={110 + i * 7} cy={meltY - 6 - (i % 2) * 6} r={i % 2 ? .7 : 1} fill="#ffe9c7" className="dial-ember" style={{ animationDelay: `${-i * .9}s` }} />)}
      </>}
      {!known && <text x="120" y="112" textAnchor="middle" className="dial-tiny">{isPow ? "AWAITING HASHRATE" : "AWAITING DATA"}</text>}

      {/* difficulty epoch orbit */}
      <circle cx="120" cy="120" r="90" fill="none" stroke="#9fb0c8" strokeOpacity=".22" strokeWidth=".5" strokeDasharray="1 4" />
      {orbit && <g><circle cx={orbit.x} cy={orbit.y} r="5.5" fill={tone} opacity=".22" /><circle cx={orbit.x} cy={orbit.y} r="2.6" fill={tone} className="dial-signal" /></g>}
      <text x="120" y="190" textAnchor="middle" className="dial-tiny">{epochKnown ? `EPOCH ${retargetProgress.toFixed(0)}%` : "EPOCH UNAVAILABLE"}</text>
      {isPow && retargetChange != null && <text x="120" y="200" textAnchor="middle" className="dial-tiny" fill={tone}>NEXT {formatPercent(retargetChange, 1)}</text>}
    </DialBezel>
  </DialCanvas>;

  const meta = chain?.instruments.forge;
  const detail = [
    isPow ? "Heat shows hashrate against its recent range" : (forgeLabel ?? "Security heat"),
    epochKnown ? `epoch ${formatPlainPercent(retargetProgress, 1)}` : null,
    isPow && retargetChange != null ? `next retarget ~${formatPercent(retargetChange, 1)}` : null,
    retargetBlocks != null ? `${retargetBlocks} blocks left` : null,
  ].filter(Boolean).join(" · ");

  if (compact) return art;
  if (stage) return <DialStageReadout reading={reading} detail={detail}>{art}</DialStageReadout>;
  return (
    <InstrumentFrame
      title={meta?.frameTitle ?? "Forge"}
      subtitle={meta?.subtitle ?? (epochKnown ? `Heat vs recent range · epoch ${formatPlainPercent(retargetProgress, 0)} through` : "Heat vs recent range · difficulty orbit")}
      reading={reading}
      large={large}
      instrumentId="forge"
    >
      {art}
    </InstrumentFrame>
  );
}
