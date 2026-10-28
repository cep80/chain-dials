"use client";

import { useId } from "react";
import { DialCanvas, DialStageReadout, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { useChainOptional } from "@/lib/chains/context";
import { LIGHT_RIG } from "@/lib/dial-light";
import { formatBtc, formatInteger, formatPlainPercent } from "@/lib/format";
import { getMetricNumeric, useDashboardStore } from "@/lib/store";

const CX = 162;
const TOP = 46;
const NECK = 122;
const BOT = 198;
const TOP_BULB = `M${CX - 34} ${TOP} C${CX - 40} ${TOP + 34} ${CX - 8} ${NECK - 22} ${CX - 3.5} ${NECK} H${CX + 3.5} C${CX + 8} ${NECK - 22} ${CX + 40} ${TOP + 34} ${CX + 34} ${TOP}Z`;
const BOT_BULB = `M${CX - 3.5} ${NECK} C${CX - 8} ${NECK + 22} ${CX - 40} ${BOT - 34} ${CX - 34} ${BOT} H${CX + 34} C${CX + 40} ${BOT - 34} ${CX + 8} ${NECK + 22} ${CX + 3.5} ${NECK}Z`;
const SAND_TOP_FULL = TOP + 10;
const PILE_FULL = NECK + 12;
const GAUGE_X = 262;
const GAUGE_TOP = 50;
const GAUGE_BOT = 196;

/**
 * Halving hourglass on a wide bench. Sand height in the lower bulb is the
 * epoch reading (scale on the left); the tube on the right is the long clock,
 * share of 21M issued. Unknown readings draw no sand and no fill.
 */
export function IssuanceHourglass({ large = false, compact = false, stage = false }: DialProps) {
  const live = useDashboardStore((s) => s.live);
  const now = useDashboardStore((s) => s.now);
  const chain = useChainOptional();
  const uid = useId().replace(/:/g, "");

  const isBtc = !chain || chain.id === "btc";
  const halving = isBtc ? getMetricNumeric(live, now, "halving_progress") : (live.issuanceProgress ?? live.retargetProgress);
  const issued = isBtc ? getMetricNumeric(live, now, "pct_issued") : live.supplyProgress;
  const blocksLeft = isBtc ? getMetricNumeric(live, now, "halving_blocks") : live.retargetBlocks;
  const supply = isBtc ? getMetricNumeric(live, now, "money_supply") : null;

  const known = halving != null && Number.isFinite(halving);
  const elapsed = known ? Math.max(0, Math.min(100, halving)) / 100 : 0;
  const issuedKnown = issued != null && Number.isFinite(issued);
  const sandTop = NECK - (1 - elapsed) * (NECK - SAND_TOP_FULL);
  const pile = BOT - elapsed * (BOT - PILE_FULL);
  const pileY = (f: number) => BOT - f * (BOT - PILE_FULL);
  const gaugeY = (f: number) => GAUGE_BOT - f * (GAUGE_BOT - GAUGE_TOP);
  const rim = LIGHT_RIG.rim;

  const reading = known ? formatPlainPercent(halving, 1) : "Awaiting height";
  const aria = known
    ? `Issuance hourglass. Current subsidy epoch ${halving.toFixed(1)} percent complete.${blocksLeft != null ? ` ${Math.round(blocksLeft)} blocks to next halving.` : ""}${issuedKnown ? ` ${issued.toFixed(2)} percent of 21 million issued.` : ""}`
    : "Issuance hourglass. Waiting for block height.";

  const cap = (y: number, flip: boolean) => <g>
    <ellipse cx={CX} cy={y + (flip ? 3 : -3)} rx="54" ry="6" fill="#000" opacity=".3" />
    <path d={`M${CX - 54} ${y - 5} H${CX + 54} V${y + 5} H${CX - 54}Z`} fill={`url(#${uid}-wood)`} stroke="#9aaac0" strokeOpacity=".35" strokeWidth=".6" />
    <path d={`M${CX - 54} ${y - 5} H${CX + 54}`} stroke="#eef3fa" strokeOpacity=".3" strokeWidth=".7" />
    <ellipse cx={CX} cy={flip ? y - 5 : y + 5} rx="40" ry="2.4" fill="#05080d" opacity=".8" />
  </g>;

  const art = <DialCanvas {...{ large, compact, stage }} wide label={aria}>
    <defs>
      <linearGradient id={`${uid}-wood`} x1={rim.x1} y1={rim.y1} x2={rim.x2} y2={rim.y2}><stop stopColor="#6c7b92" /><stop offset=".3" stopColor="#232e3e" /><stop offset=".7" stopColor="#0e141e" /><stop offset="1" stopColor="#3a4a60" /></linearGradient>
      <linearGradient id={`${uid}-post`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#4a586e" /><stop offset=".35" stopColor="#c3cede" stopOpacity=".8" /><stop offset=".6" stopColor="#1a2433" /><stop offset="1" stopColor="#0b111b" /></linearGradient>
      <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#dbe6f6" stopOpacity=".2" /><stop offset=".22" stopColor="#dbe6f6" stopOpacity=".04" /><stop offset=".8" stopColor="#dbe6f6" stopOpacity=".02" /><stop offset="1" stopColor="#dbe6f6" stopOpacity=".14" /></linearGradient>
      <linearGradient id={`${uid}-sand`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff1dc" stopOpacity=".9" /><stop offset=".18" stopColor="var(--accent)" /><stop offset="1" stopColor="var(--accent-dim)" /></linearGradient>
      <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%"><stop stopColor="var(--accent)" stopOpacity=".12" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
      <clipPath id={`${uid}-top`}><path d={TOP_BULB} /></clipPath>
      <clipPath id={`${uid}-bot`}><path d={BOT_BULB} /></clipPath>
    </defs>

    <ellipse cx={CX} cy="124" rx="120" ry="96" fill={`url(#${uid}-halo)`} />
    <ellipse cx={CX} cy="214" rx="72" ry="7" fill="#000" opacity=".35" />

    {/* back post */}
    <rect x={CX - 2} y={TOP - 4} width="4" height={BOT - TOP + 8} fill="#0b111b" opacity=".8" />

    {/* glass and sand */}
    <path d={TOP_BULB} fill="#04070c" fillOpacity=".55" />
    <path d={BOT_BULB} fill="#04070c" fillOpacity=".55" />
    {known && elapsed < 1 && <g clipPath={`url(#${uid}-top)`}>
      <rect x={CX - 44} y={sandTop} width="88" height={NECK - sandTop + 2} fill={`url(#${uid}-sand)`} />
      <path d={`M${CX - 44} ${sandTop} Q${CX} ${sandTop + Math.min(10, (NECK - sandTop) * .6)} ${CX + 44} ${sandTop}`} fill="#04070c" fillOpacity=".55" />
      {[0.35, 0.7].map((k) => <path key={k} d={`M${CX - 44} ${sandTop + (NECK - sandTop) * k} H${CX + 44}`} stroke="#000" strokeOpacity=".12" strokeWidth=".8" />)}
    </g>}
    {known && elapsed > 0 && <g clipPath={`url(#${uid}-bot)`}>
      <path d={`M${CX - 46} ${BOT + 2} V${pile + 7} Q${CX - 22} ${pile + 4} ${CX} ${pile} Q${CX + 22} ${pile + 4} ${CX + 46} ${pile + 7} V${BOT + 2}Z`} fill={`url(#${uid}-sand)`} />
      {[0.4, 0.75].map((k) => <path key={k} d={`M${CX - 46} ${pile + (BOT - pile) * k} H${CX + 46}`} stroke="#000" strokeOpacity=".12" strokeWidth=".8" />)}
    </g>}
    {known && elapsed > 0 && elapsed < 1 && <path d={`M${CX} ${NECK - 1} V${pile}`} stroke="var(--accent)" strokeOpacity=".55" strokeWidth=".8" strokeDasharray=".8 2.2" />}
    {[TOP_BULB, BOT_BULB].map((d) => <path key={d} d={d} fill={`url(#${uid}-glass)`} stroke="#b4c4da" strokeOpacity=".4" strokeWidth=".7" />)}
    <path d={`M${CX - 28} ${TOP + 8} C${CX - 31} ${TOP + 30} ${CX - 18} ${NECK - 30} ${CX - 9} ${NECK - 14}`} fill="none" stroke="#f2f7ff" strokeOpacity=".3" strokeWidth="1.6" strokeLinecap="round" />
    <path d={`M${CX - 10} ${NECK + 16} C${CX - 22} ${NECK + 34} ${CX - 31} ${BOT - 30} ${CX - 28} ${BOT - 8}`} fill="none" stroke="#f2f7ff" strokeOpacity=".2" strokeWidth="1.4" strokeLinecap="round" />

    {/* frame */}
    {[-46, 46].map((dx) => <g key={dx}>
      <rect x={CX + dx - 2.6} y={TOP - 4} width="5.2" height={BOT - TOP + 8} rx="2" fill={`url(#${uid}-post)`} />
      {[TOP + 14, (TOP + BOT) / 2, BOT - 14].map((y) => <ellipse key={y} cx={CX + dx} cy={y} rx="4" ry="2" fill={`url(#${uid}-post)`} />)}
    </g>)}
    {cap(TOP - 6, false)}
    {cap(BOT + 6, true)}

    {/* epoch scale, left of the lower bulb */}
    <text x="56" y={PILE_FULL - 12} className="dial-tiny">EPOCH %</text>
    {[0, .25, .5, .75, 1].map((f) => {
      const major = f === 0 || f === .5 || f === 1;
      return <g key={f}><path d={`M${CX - 62} ${pileY(f)} h${major ? -7 : -4}`} stroke="#8fa2c0" strokeOpacity=".55" strokeWidth=".6" />{major && <text x={CX - 72} y={pileY(f) + 2} textAnchor="end" className="dial-tiny">{f * 100}</text>}</g>;
    })}
    {known && <g>
      <path d={`M${CX - 60} ${pile} l-4 -2.5 v5Z`} fill="var(--accent)" />
      <path d={`M${CX - 58} ${pile} H${CX - 30}`} stroke="var(--accent)" strokeOpacity=".35" strokeWidth=".5" strokeDasharray="1.5 3" />
    </g>}
    <text x="56" y="62" className="dial-tiny">{isBtc ? "TO HALVING" : "REMAINING"}</text>
    <text x="56" y="73" className="dial-label" fill="#f3efe6" style={{ fontSize: "9px" }}>{blocksLeft != null ? formatInteger(blocksLeft) : "—"}</text>
    <text x="56" y="83" className="dial-tiny" opacity=".75">{isBtc ? "BLOCKS" : "LEFT"}</text>

    {/* long clock: share of 21M issued */}
    <text x={GAUGE_X + 6} y={GAUGE_TOP - 10} textAnchor="middle" className="dial-tiny">{isBtc ? "21M" : "SUPPLY"}</text>
    <rect x={GAUGE_X} y={GAUGE_TOP} width="12" height={GAUGE_BOT - GAUGE_TOP} rx="6" fill="#04070c" stroke="#9fb0c8" strokeOpacity=".35" strokeWidth=".6" />
    {issuedKnown && <rect x={GAUGE_X + 2.5} y={gaugeY(Math.min(1, issued / 100))} width="7" height={GAUGE_BOT - 2 - gaugeY(Math.min(1, issued / 100))} rx="3.5" fill={`url(#${uid}-sand)`} opacity=".85" />}
    <path d={`M${GAUGE_X + 3.5} ${GAUGE_TOP + 6} V${GAUGE_BOT - 8}`} stroke="#f2f7ff" strokeOpacity=".22" strokeWidth="1" strokeLinecap="round" />
    {[0, .5, 1].map((f) => <g key={f}><path d={`M${GAUGE_X + 14} ${gaugeY(f)} h4`} stroke="#8fa2c0" strokeOpacity=".55" strokeWidth=".6" /><text x={GAUGE_X + 21} y={gaugeY(f) + 2} className="dial-tiny">{f * 100}</text></g>)}
    <text x={GAUGE_X + 6} y={GAUGE_BOT + 13} textAnchor="middle" className="dial-tiny" fill="#f3efe6">{issuedKnown ? formatPlainPercent(issued, isBtc ? 2 : 1) : "—"}</text>
    <text x={GAUGE_X + 6} y={GAUGE_BOT + 22} textAnchor="middle" className="dial-tiny" opacity=".75">ISSUED</text>

    {!known && <text x={CX} y={NECK + 3} textAnchor="middle" className="dial-tiny">AWAITING HEIGHT</text>}
  </DialCanvas>;

  const detail = [
    isBtc ? "Lower bulb: share of this subsidy era elapsed" : "Lower bulb: share of this epoch elapsed",
    blocksLeft != null ? `${formatInteger(blocksLeft)} ${isBtc ? "blocks to the halving" : "left"}` : null,
    issuedKnown ? `${formatPlainPercent(issued, 2)} of ${isBtc ? "21M" : "supply"} issued${supply != null ? ` · ${formatBtc(supply, 0)}` : ""}` : null,
  ].filter(Boolean).join(" · ");

  if (compact) return art;
  if (stage) return <DialStageReadout reading={reading} detail={detail}>{art}</DialStageReadout>;
  return (
    <InstrumentFrame
      title={chain?.instruments.issuance.frameTitle ?? "Issuance"}
      subtitle={!isBtc
        ? (chain?.instruments.issuance.subtitle ?? `${formatInteger(blocksLeft)} left in this stretch`)
        : blocksLeft != null ? `${formatInteger(blocksLeft)} blocks till the reward halves` : "Sand tracks this subsidy era"}
      reading={reading}
      large={large}
      instrumentId="issuance"
    >
      {art}
    </InstrumentFrame>
  );
}
