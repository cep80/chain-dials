"use client";

import { useId } from "react";
import { DialCanvas, type DialProps } from "@/components/viz/DialPrimitives";
import { keyLight } from "@/lib/dial-light";

/**
 * Shared issuance-family vessel for the SOL and HYPE fountains.
 * Two readings, two printed scales: the basin level (right scale) and the jet
 * height (left scale). Unknown readings draw nothing for that part: no water
 * in the tank, no jet from the nozzle.
 */
export type FountainDialProps = DialProps & {
  label: string;
  /** Basin fill, 0–1, or null when the feed is unavailable. */
  level: number | null;
  levelTitle: string;
  /** Jet height, 0–1 of the printed spray scale, or null when unknown. */
  spray: number | null;
  sprayTitle: string;
  sprayTicks: ReadonlyArray<{ at: number; label: string }>;
  /** Value printed beside the jet apex. */
  sprayValue?: string;
};

const TANK_L = 64;
const TANK_R = 176;
const TANK_TOP = 138;
const TANK_BOT = 192;
const RX = (TANK_R - TANK_L) / 2;
const RY = 9;
const NOZZLE_Y = 120;
const SCALE_TOP = 34;

function quad(t: number, p0: number, p1: number, p2: number) {
  return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
}

const sprayY = (f: number) => NOZZLE_Y - 4 - f * (NOZZLE_Y - 4 - SCALE_TOP);

export function FountainDial({ label, level, levelTitle, spray, sprayTitle, sprayTicks, sprayValue, compact, large, stage }: FountainDialProps) {
  const uid = useId().replace(/:/g, "");
  const light = keyLight();
  const lvl = level != null && Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : null;
  const jet = spray != null && Number.isFinite(spray) ? Math.max(0, Math.min(1, spray)) : null;
  const surface = lvl != null ? TANK_BOT - lvl * (TANK_BOT - TANK_TOP) : TANK_BOT;
  const apex = jet != null ? sprayY(jet) : NOZZLE_Y;
  const landing = surface - 1;
  const strands = jet != null && jet > 0.01
    ? [16, 27, 38, 48].map((dx, i) => ({ dx: dx * (0.55 + jet * 0.45), o: 0.85 - i * 0.17 }))
    : [];

  return <DialCanvas {...{ compact, large, stage }} label={label}>
    <defs>
      <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%"><stop stopColor="var(--accent)" stopOpacity={0.1 + (jet ?? 0) * 0.16} /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${uid}-glass`}><stop stopColor="#d8e4f5" stopOpacity=".2" /><stop offset=".1" stopColor="#d8e4f5" stopOpacity=".04" /><stop offset=".78" stopColor="#d8e4f5" stopOpacity=".01" /><stop offset="1" stopColor="#d8e4f5" stopOpacity=".16" /></linearGradient>
      <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--accent)" stopOpacity=".55" /><stop offset=".35" stopColor="var(--accent)" stopOpacity=".28" /><stop offset="1" stopColor="var(--accent-dim)" stopOpacity=".12" /></linearGradient>
      <radialGradient id={`${uid}-surface`} cx={light.cx} cy={light.cy} r="80%"><stop stopColor="#f3f8ff" stopOpacity=".55" /><stop offset=".4" stopColor="var(--accent)" stopOpacity=".55" /><stop offset="1" stopColor="var(--accent)" stopOpacity=".2" /></radialGradient>
      <linearGradient id={`${uid}-jet`} x1="0" y1="1" x2="0" y2="0"><stop stopColor="#f6fbff" /><stop offset=".55" stopColor="var(--accent)" stopOpacity=".9" /><stop offset="1" stopColor="var(--accent)" stopOpacity=".15" /></linearGradient>
      <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#5a6a82" /><stop offset=".3" stopColor="#c3cede" stopOpacity=".7" /><stop offset=".55" stopColor="#1a2433" /><stop offset="1" stopColor="#0b111b" /></linearGradient>
      <linearGradient id={`${uid}-base`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3e4f66" /><stop offset=".25" stopColor="#111a28" /><stop offset=".8" stopColor="#080e18" /><stop offset="1" stopColor="#28374d" /></linearGradient>
      <clipPath id={`${uid}-tank`}><path d={`M${TANK_L} ${TANK_TOP - RY} V${TANK_BOT} A${RX} ${RY} 0 0 0 ${TANK_R} ${TANK_BOT} V${TANK_TOP - RY} Z`} /></clipPath>
    </defs>

    <circle cx="120" cy="128" r="104" fill={`url(#${uid}-halo)`} />
    <ellipse cx="120" cy="208" rx="74" ry="9" fill="#000" opacity=".35" />

    {/* plinth */}
    <path d={`M${TANK_L - 10} ${TANK_BOT + 4} L${TANK_L - 2} ${TANK_BOT - 2} H${TANK_R + 2} L${TANK_R + 10} ${TANK_BOT + 4} V${TANK_BOT + 11} L${TANK_R} ${TANK_BOT + 17} H${TANK_L} L${TANK_L - 10} ${TANK_BOT + 11}Z`} fill={`url(#${uid}-base)`} stroke="#8a9bb4" strokeOpacity=".35" strokeWidth=".6" />

    {/* back wall of the tank */}
    <ellipse cx="120" cy={TANK_TOP} rx={RX} ry={RY} fill="#060b13" fillOpacity=".7" stroke="#a9bad3" strokeOpacity=".22" strokeWidth=".6" />

    {/* column and nozzle, behind the water */}
    <rect x="115.5" y={NOZZLE_Y} width="9" height={TANK_BOT - NOZZLE_Y} fill={`url(#${uid}-metal)`} />
    <path d={`M112 ${NOZZLE_Y + 3} L114 ${NOZZLE_Y - 3} H126 L128 ${NOZZLE_Y + 3}Z`} fill={`url(#${uid}-metal)`} stroke="#c3cede" strokeOpacity=".35" strokeWidth=".5" />
    <ellipse cx="120" cy={NOZZLE_Y - 3} rx="6" ry="1.6" fill="#05090f" stroke="#c3cede" strokeOpacity=".4" strokeWidth=".4" />

    {/* water */}
    {lvl != null && lvl > 0 && <g clipPath={`url(#${uid}-tank)`}>
      <rect x={TANK_L} y={surface} width={TANK_R - TANK_L} height={TANK_BOT - surface + RY} fill={`url(#${uid}-water)`} />
      {[0.3, 0.6].map((k) => <path key={k} d={`M${TANK_L} ${surface + (TANK_BOT - surface) * k} H${TANK_R}`} stroke="var(--accent)" strokeOpacity=".12" strokeWidth=".5" />)}
    </g>}
    {lvl != null && <ellipse cx="120" cy={surface} rx={RX - 0.5} ry={RY - 0.5} fill={`url(#${uid}-surface)`} opacity={lvl > 0 ? 0.75 : 0.15} stroke="#e6f0ff" strokeOpacity=".35" strokeWidth=".5" />}

    {/* jet: rising column, then strands that fall back to the water */}
    {jet != null && jet > 0.01 && <g>
      <path d={`M117.6 ${NOZZLE_Y - 3} C118.6 ${(NOZZLE_Y + apex) / 2} 119.4 ${apex + 8} 120 ${apex} C120.6 ${apex + 8} 121.4 ${(NOZZLE_Y + apex) / 2} 122.4 ${NOZZLE_Y - 3}Z`} fill={`url(#${uid}-jet)`} />
      <path d={`M120 ${NOZZLE_Y - 4} V${apex + 3}`} stroke="#ffffff" strokeOpacity=".8" strokeWidth=".7" />
      {strands.map((s, i) => [-1, 1].map((side) => {
        const x2 = 120 + side * s.dx;
        const cx = 120 + side * s.dx * 0.62;
        const cy = apex - 7 - i * 1.5;
        return <g key={`${i}${side}`}>
          <path d={`M120 ${apex} Q${cx} ${cy} ${x2} ${landing}`} fill="none" stroke="var(--accent)" strokeOpacity={s.o * 0.3} strokeWidth="2.2" strokeLinecap="round" />
          <path d={`M120 ${apex} Q${cx} ${cy} ${x2} ${landing}`} fill="none" stroke="#eef6ff" strokeOpacity={s.o * 0.75} strokeWidth=".6" strokeLinecap="round" />
          {[0.35, 0.55, 0.72, 0.86].map((t, k) => <circle key={k} cx={quad(t, 120, cx, x2)} cy={quad(t, apex, cy, landing)} r={k % 2 ? .65 : 1} fill="#f2f8ff" opacity={s.o * 0.8} />)}
          {lvl != null && <ellipse cx={x2} cy={landing + 1} rx={2.6 + i * 0.4} ry=".8" fill="none" stroke="#e6f0ff" strokeOpacity={s.o * 0.45} strokeWidth=".45" />}
        </g>;
      }))}
      <circle cx="120" cy={apex} r="2.2" fill="#ffffff" className="dial-signal" />
    </g>}

    {/* front glass */}
    <path d={`M${TANK_L} ${TANK_TOP} V${TANK_BOT} A${RX} ${RY} 0 0 0 ${TANK_R} ${TANK_BOT} V${TANK_TOP}`} fill={`url(#${uid}-glass)`} stroke="#a9bad3" strokeOpacity=".32" strokeWidth=".65" />
    <path d={`M${TANK_L} ${TANK_TOP} A${RX} ${RY} 0 0 0 ${TANK_R} ${TANK_TOP}`} fill="none" stroke="#dce7f7" strokeOpacity=".45" strokeWidth=".7" />
    <path d={`M${TANK_L + 6} ${TANK_TOP + 8} V${TANK_BOT - 2}`} stroke="#eef4ff" strokeOpacity=".22" strokeWidth="1.4" strokeLinecap="round" />

    {/* basin scale, right */}
    {[0, .25, .5, .75, 1].map((f) => {
      const y = TANK_BOT - f * (TANK_BOT - TANK_TOP);
      const major = f === 0 || f === .5 || f === 1;
      return <g key={f}><path d={`M${TANK_R + 4} ${y} h${major ? 7 : 4}`} stroke="#8fa2c0" strokeOpacity=".55" strokeWidth=".6" />{major && <text x={TANK_R + 14} y={y + 2} className="dial-tiny">{f * 100}</text>}</g>;
    })}
    {lvl != null && <path d={`M${TANK_R + 2} ${surface} l4 -2.5 v5Z`} fill="var(--accent)" />}

    {/* spray scale, left */}
    <path d={`M44 ${NOZZLE_Y - 4} V${SCALE_TOP}`} stroke="#8fa2c0" strokeOpacity=".3" strokeWidth=".5" />
    {sprayTicks.map((t) => <g key={t.label}><path d={`M44 ${sprayY(t.at)} h-5`} stroke="#8fa2c0" strokeOpacity=".55" strokeWidth=".6" /><text x="37" y={sprayY(t.at) + 2} textAnchor="end" className="dial-tiny">{t.label}</text></g>)}
    {jet != null && <g>
      <path d={`M46 ${apex} H112`} stroke="var(--accent)" strokeOpacity=".35" strokeWidth=".5" strokeDasharray="1.5 3" />
      <path d={`M44 ${apex} l-4 -2.5 v5Z`} fill="var(--accent)" />
      {sprayValue && <text x="50" y={apex - 3} className="dial-tiny" fill="#e7eefb">{sprayValue}</text>}
    </g>}

    <text x="18" y="22" className="dial-tiny">{sprayTitle}</text>
    <text x={TANK_R + 26} y={TANK_TOP - 16} textAnchor="end" className="dial-tiny">{levelTitle}</text>
    {jet == null && <text x="120" y="88" textAnchor="middle" className="dial-tiny">AWAITING SPRAY</text>}
    {lvl == null && <text x="120" y={TANK_BOT - 18} textAnchor="middle" className="dial-tiny">BASIN UNAVAILABLE</text>}
  </DialCanvas>;
}
