"use client";

import { useId, useMemo } from "react";
import { DialCanvas, DialStageReadout, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatInteger, formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

const LEFT = 40;
const RIGHT = 292;
const MID = 112;
const AMP = 62;

function formatBps(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)} bps`;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}

/** A tidy step for the printed bps scale. */
function niceCeil(v: number) {
  const steps = [0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40, 50, 100];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 100) * 100;
}

/**
 * Signed funding around a printed zero line: above zero longs pay shorts,
 * below zero shorts pay longs. Both halves share one scale.
 */
export function FundingTide({ large = false, compact = false, stage = false }: DialProps) {
  // The HYPE adapter carries the funding series, in bps, on baseFeeSeries.
  const raw = useDashboardStore((s) => s.live.baseFeeSeries);
  const pressure = useDashboardStore((s) => s.live.mempoolPressure);
  const count = useDashboardStore((s) => s.live.mempoolCount);
  const uid = useId().replace(/:/g, "");

  const series = useMemo(() => raw.filter((v) => Number.isFinite(v)), [raw]);
  const latest = series.at(-1) ?? null;
  const med = median(series);
  const cap = niceCeil(Math.max(0.25, ...series.map((v) => Math.abs(v))) * 1.1);
  const y = (v: number) => MID - Math.max(-1, Math.min(1, v / cap)) * AMP;
  const x = (i: number) => LEFT + (series.length > 1 ? i / (series.length - 1) : 0.5) * (RIGHT - LEFT);

  const { line, area } = useMemo(() => {
    if (series.length < 2) return { line: "", area: "" };
    const pts = series.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`);
    const l = `M${pts.join(" L")}`;
    return { line: l, area: `${l} L${x(series.length - 1)},${MID} L${x(0)},${MID}Z` };
    // x and y are pure functions of series and cap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, cap]);

  const reading = latest != null ? formatBps(latest) : "Awaiting funding";
  const ticks = [1, .5, 0, -.5, -1];

  const art = <DialCanvas {...{ large, compact, stage }} wide label={`Funding tide. Latest ${reading}. Above the zero line longs pay shorts; below it shorts pay longs.`}>
    <defs>
      <linearGradient id={`${uid}-chamber`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#142629" /><stop offset=".6" stopColor="#070d10" /><stop offset="1" stopColor="#122226" /></linearGradient>
      <linearGradient id={`${uid}-long`} x1="0" y1={MID - AMP} x2="0" y2={MID} gradientUnits="userSpaceOnUse"><stop stopColor="var(--accent)" stopOpacity=".7" /><stop offset="1" stopColor="var(--accent)" stopOpacity=".05" /></linearGradient>
      <linearGradient id={`${uid}-short`} x1="0" y1={MID} x2="0" y2={MID + AMP} gradientUnits="userSpaceOnUse"><stop stopColor="#ff5c5c" stopOpacity=".05" /><stop offset="1" stopColor="#ff5c5c" stopOpacity=".5" /></linearGradient>
      <clipPath id={`${uid}-above`}><rect x={LEFT} y={MID - AMP - 4} width={RIGHT - LEFT} height={AMP + 4} /></clipPath>
      <clipPath id={`${uid}-below`}><rect x={LEFT} y={MID} width={RIGHT - LEFT} height={AMP + 4} /></clipPath>
    </defs>
    <path d="M17 18 H303 L314 29 V204 L301 219 H19 L6 206 V29 Z" fill={`url(#${uid}-chamber)`} stroke="#7a8fac" strokeOpacity=".35" strokeWidth=".7" />
    <path d="M19 22 H301 M10 33 V198 M19 215 H299" fill="none" stroke="#e1ebff" strokeOpacity=".14" strokeWidth=".6" />
    <text x="25" y="37" className="dial-tiny">FUNDING TIDE</text>
    <text x="294" y="37" textAnchor="end" className="dial-tiny">BPS / HOUR</text>

    {ticks.map((t) => <g key={t}>
      <path d={`M${LEFT} ${y(t * cap)} H${RIGHT}`} stroke={t === 0 ? "#dfe9f7" : "#7890b8"} strokeOpacity={t === 0 ? .45 : .15} strokeWidth={t === 0 ? .7 : .5} strokeDasharray={t === 0 ? undefined : "2 4"} />
      <text x={LEFT - 4} y={y(t * cap) + 2} textAnchor="end" className="dial-tiny" opacity=".85">{t === 0 ? "0" : `${t > 0 ? "+" : "−"}${+(Math.abs(t) * cap).toFixed(2)}`}</text>
    </g>)}
    <text x={RIGHT - 2} y={MID - AMP + 8} textAnchor="end" className="dial-tiny" opacity=".7">LONGS PAY ↑</text>
    <text x={RIGHT - 2} y={MID + AMP - 3} textAnchor="end" className="dial-tiny" opacity=".7">SHORTS PAY ↓</text>

    {line && <g>
      <path d={area} fill={`url(#${uid}-long)`} clipPath={`url(#${uid}-above)`} />
      <path d={area} fill={`url(#${uid}-short)`} clipPath={`url(#${uid}-below)`} />
      <path d={line} fill="none" stroke="var(--accent)" strokeOpacity=".14" strokeWidth="6" strokeLinejoin="round" />
      <path d={line} fill="none" stroke="#e8fffa" strokeOpacity=".9" strokeWidth="1.2" strokeLinejoin="round" clipPath={`url(#${uid}-above)`} />
      <path d={line} fill="none" stroke="#ffb3b3" strokeOpacity=".9" strokeWidth="1.2" strokeLinejoin="round" clipPath={`url(#${uid}-below)`} />
      {series.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r=".9" fill={v >= 0 ? "#e8fffa" : "#ffb3b3"} opacity=".6" />)}
    </g>}
    {med != null && series.length > 1 && <g>
      <path d={`M${LEFT} ${y(med)} H${RIGHT}`} stroke="var(--accent)" strokeOpacity=".45" strokeWidth=".5" strokeDasharray="6 3" />
      <text x={LEFT + 3} y={y(med) + (med >= 0 ? 8 : -3)} className="dial-tiny" fill="#c9f5ea">MEDIAN</text>
    </g>}
    {latest != null && <g>
      <circle cx={x(series.length - 1)} cy={y(latest)} r="5" fill="var(--accent)" opacity=".2" />
      <circle cx={x(series.length - 1)} cy={y(latest)} r="2.6" fill="#f2fffb" className="dial-signal" />
    </g>}
    {latest == null && <text x="166" y={MID - 6} textAnchor="middle" className="dial-label">AWAITING FUNDING</text>}

    <path d={`M${LEFT} 186 H${RIGHT}`} stroke="#8598ba" strokeOpacity=".28" strokeWidth=".5" />
    <text x={LEFT} y="204" className="dial-tiny">{series.length ? `${series.length} SAMPLES` : "NO SAMPLES"}</text>
    <text x="293" y="204" textAnchor="end" className="dial-tiny">NOW →</text>
  </DialCanvas>;

  if (compact) return art;
  if (stage) return <DialStageReadout reading={reading} detail={[
    "HYPE perp funding, hourly",
    med != null ? `median ${formatBps(med)}` : null,
    "Above zero: longs pay shorts",
    pressure != null ? `gas ${formatPlainPercent(pressure, 0)} full` : null,
    count != null ? `${formatInteger(count)} perps` : null,
  ].filter(Boolean).join(" · ")}>{art}</DialStageReadout>;
  return <InstrumentFrame title="Tide" subtitle="HYPE funding · above zero longs pay" reading={reading} large={large} instrumentId="atmosphere">{art}</InstrumentFrame>;
}
