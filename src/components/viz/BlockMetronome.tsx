"use client";

import { useEffect, useId, useState } from "react";
import { DialBezel, DialCanvas, DialStageReadout, polar, type DialProps } from "@/components/viz/DialPrimitives";
import { useInstrumentActive } from "@/components/viz/InstrumentActivity";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { useChainOptional } from "@/lib/chains/context";
import { LIGHT_RIG } from "@/lib/dial-light";
import { feedCatchupLabel, isFeedCatchingUp } from "@/lib/feed-status";
import { formatDuration } from "@/lib/format";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useDashboardStore } from "@/lib/store";
import { metronomeHandDegrees, metronomeTone } from "@/lib/viz-scale";

const DEFAULT_TARGET = 600;

const TONE = {
  calm: "var(--accent)",
  late: "var(--warn)",
  stale: "var(--down)",
} as const;

/**
 * Cadence dial for proof-of-work blocks. One hand sweeps once per target
 * interval; laps past the target become studs on the bezel instead of a second
 * ring, and the face cools to warn and stale tones as the wait grows.
 */
export function BlockMetronome({ large = false, compact = false, stage = false }: DialProps) {
  const tipTimestamp = useDashboardStore((s) => s.live.tipTimestamp);
  const height = useDashboardStore((s) => s.live.blockHeight);
  const boardPulse = useDashboardStore((s) => s.boardPulse);
  const connection = useDashboardStore((s) => s.connection);
  const chain = useChainOptional();
  const target = chain?.targetBlockSeconds ?? DEFAULT_TARGET;
  const cadence = chain?.cadenceLabel ?? "block";
  const reduce = useAppReducedMotion();
  const active = useInstrumentActive();
  const uid = useId().replace(/:/g, "");
  const catchingUp = isFeedCatchingUp(connection);
  const catchupNote = feedCatchupLabel(connection);

  const [tickMs, setTickMs] = useState(() => Date.now());
  useEffect(() => {
    if (!active || tipTimestamp == null) return;
    const tick = () => setTickMs(Date.now());
    tick();
    const id = window.setInterval(tick, reduce ? 1000 : 250);
    return () => window.clearInterval(id);
  }, [tipTimestamp, reduce, boardPulse, active]);

  const since = tipTimestamp == null ? null : Math.max(0, (tickMs - tipTimestamp) / 1000);
  const raw = since != null ? since / target : 0;
  const laps = Math.floor(raw);
  // While the feed is catching up, clock age is not a network lateness signal.
  const tone = catchingUp ? "calm" : metronomeTone(since, target);
  const stroke = TONE[tone];
  // Unwrapped angle: the CSS transition keeps moving forward across a lap.
  const angle = metronomeHandDegrees(since, target);
  const studs = Math.min(12, laps);

  const reading = catchingUp && since == null ? "…" : formatDuration(since);
  const targetLabel = target >= 60 ? `${Math.round(target / 60)} min` : target >= 1 ? `${target}s` : `${Math.round(target * 1000)}ms`;
  const numeral = (i: number) => {
    const v = (target * i) / 10;
    return target >= 60 ? `${+(v / 60).toFixed(1)}` : `${+v.toFixed(1)}`;
  };
  const aria = `Metronome. Time since last ${cadence}: ${reading}. Target interval ${targetLabel}.${
    catchupNote ? ` Feed ${catchupNote.toLowerCase()}; reading may be outdated.` : laps > 0 ? ` ${laps} interval${laps === 1 ? "" : "s"} overdue.` : ""
  }`;
  const shadow = LIGHT_RIG.shadow;

  const art = <DialCanvas {...{ large, compact, stage }} label={aria}>
    <defs>
      <radialGradient id={`${uid}-tone`}><stop stopColor={stroke} stopOpacity={tone === "calm" ? 0 : tone === "late" ? .14 : .2} /><stop offset="1" stopColor={stroke} stopOpacity="0" /></radialGradient>
      <linearGradient id={`${uid}-hand`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#f6f9ff" /><stop offset=".5" stopColor="#dbe5f3" /><stop offset="1" stopColor="#8d9db5" /></linearGradient>
      <radialGradient id={`${uid}-hub`} cx="38%" cy="32%" r="70%"><stop stopColor="#f2f6fc" /><stop offset=".45" stopColor="#8899b1" /><stop offset="1" stopColor="#1a2433" /></radialGradient>
    </defs>
    <DialBezel ticks={40}>
      <circle cx="120" cy="120" r="102" fill={`url(#${uid}-tone)`} />

      {/* the expected window: one lap, a soft band from 0 to the target */}
      <circle cx="120" cy="120" r="88" fill="none" stroke={stroke} strokeOpacity=".08" strokeWidth="5" />
      {Array.from({ length: 10 }, (_, i) => {
        const p = polar(80, i * 36);
        return <text key={i} x={p.x} y={p.y + 2.4} textAnchor="middle" className={i === 0 ? "dial-label" : "dial-tiny"} fill={i === 0 ? "#f3f6fb" : undefined} style={i === 0 ? undefined : { fontSize: "7.4px" }}>{numeral(i)}</text>;
      })}
      <text x="120" y="98" textAnchor="middle" className="dial-tiny">{target >= 60 ? "MIN" : "S"} SINCE {cadence.toUpperCase()}</text>

      {/* overdue laps as studs on the bezel */}
      {Array.from({ length: studs }, (_, i) => {
        const p = polar(108.5, i * 9 + 4.5);
        return <g key={i}><circle cx={p.x} cy={p.y} r="2.9" fill={stroke} opacity=".22" /><circle cx={p.x} cy={p.y} r="1.6" fill={stroke} /></g>;
      })}

      {since != null && <g opacity={catchingUp ? 0.45 : 1}>
        <g style={{ transform: `translate(${shadow.dy * .6}px, ${shadow.dy}px) rotate(${angle}deg)`, transformOrigin: "120px 120px", transition: reduce ? undefined : "transform 250ms linear" }} opacity=".45">
          <path d="M118.4 142 L119.4 40 L120.6 40 L121.6 142Z" fill="#000" />
        </g>
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "120px 120px", transition: reduce ? undefined : "transform 250ms linear" }}>
          <path d="M117.2 144 L119.3 40 L120.7 40 L122.8 144Z" fill={`url(#${uid}-hand)`} />
          <path d="M120 44 V102" stroke={stroke} strokeWidth="1.3" />
          <circle cx="120" cy="140" r="4.6" fill="#1a2433" stroke="#8d9db5" strokeWidth=".6" />
          <circle cx="120" cy="44" r="2.2" fill={stroke} />
        </g>
      </g>}
      <circle cx="120" cy="120" r="8.5" fill={`url(#${uid}-hub)`} stroke="#02050a" strokeWidth=".8" />
      <circle cx="120" cy="120" r="2.4" fill={stroke} />

      <text x="120" y="164" textAnchor="middle" className="dial-label" fill="#f3f6fb">{since != null ? reading : "AWAITING TIP"}</text>
      <text x="120" y="178" textAnchor="middle" className="dial-tiny" fill={tone === "calm" ? undefined : stroke}>
        {catchupNote ? catchupNote.toUpperCase() : laps > 0 ? `+${laps} LAP${laps === 1 ? "" : "S"} OVER ${targetLabel.toUpperCase()}` : `TARGET ${targetLabel.toUpperCase()}`}
      </text>
      {height != null && <text x="120" y="190" textAnchor="middle" className="dial-tiny" opacity=".7">#{height.toLocaleString("en-US")}</text>}
    </DialBezel>
  </DialCanvas>;

  if (compact) return art;
  if (stage) {
    return <DialStageReadout reading={reading} detail={catchupNote ? `${catchupNote} feed · last known since ${cadence}` : `Since the last ${cadence}${laps > 0 ? ` · ${laps}× past the usual ${targetLabel}` : ` · one sweep = ${targetLabel}`}`}>{art}</DialStageReadout>;
  }

  const meta = chain?.instruments.metronome;
  return (
    <InstrumentFrame
      title={meta?.frameTitle ?? "Metronome"}
      subtitle={catchupNote ? `${catchupNote} feed · showing last known tip time` : laps > 0 ? `Still waiting · ${laps}× past the usual ${targetLabel}` : (meta?.subtitle ?? `Aims for ~${targetLabel} between ${cadence}s`)}
      reading={reading}
      large={large}
      instrumentId="metronome"
    >
      {art}
    </InstrumentFrame>
  );
}
