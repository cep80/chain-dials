"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DialBezel, DialCanvas, DialStageReadout, polar, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { ribbonSegments } from "@/lib/dial-geometry";
import { keyLight, LIGHT_RIG } from "@/lib/dial-light";
import { formatHash, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

/** Key light direction around the ring, for shading each ribbon segment. */
const LIGHT_ANGLE = Math.atan2(LIGHT_RIG.key.cy - 0.5, LIGHT_RIG.key.cx - 0.5);

export function LeaderRibbon({ large = false, compact = false, stage = false }: DialProps) {
  const hash = useDashboardStore((s) => s.live.tipHash);
  const height = useDashboardStore((s) => s.live.blockHeight);
  const uid = useId().replace(/:/g, "");
  const light = keyLight();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const segments = useMemo(() => hash ? ribbonSegments(hash) : [], [hash]);

  const art = <DialCanvas {...{ large, compact, stage }} label={hash ? `Leader ribbon. A ring woven from all 64 digits of slot ${height ?? ""}'s blockhash; width follows each digit.` : "Leader ribbon. Waiting for blockhash."}>
    <defs>
      <radialGradient id={`${uid}-core`} cx={light.cx} cy={light.cy} r="70%"><stop stopColor="var(--accent)" stopOpacity=".18" /><stop offset=".6" stopColor="var(--accent)" stopOpacity=".03" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
    </defs>
    <DialBezel ticks={64}>
      <circle cx="120" cy="120" r="84" fill={`url(#${uid}-core)`} />
      <circle cx="120" cy="120" r="62" fill="none" stroke="var(--accent)" strokeOpacity=".1" strokeWidth="26" />
      <circle cx="120" cy="120" r="48" fill="none" stroke="#9fb0c8" strokeOpacity=".14" strokeWidth=".5" />
      <circle cx="120" cy="120" r="76" fill="none" stroke="#9fb0c8" strokeOpacity=".14" strokeWidth=".5" />
      <g className="dial-relief" key={hash ?? "empty"}>
        {segments.map((s, i) => {
          const mid = -Math.PI / 2 + (i + 0.5) * (Math.PI * 2 / 64);
          const lit = (Math.cos(mid - LIGHT_ANGLE) + 1) / 2;
          return <path key={i} d={s.d}
            fill="var(--accent)"
            fillOpacity={s.front ? 0.45 + lit * 0.45 : 0.3 + lit * 0.32}
            stroke={s.front ? "#effff8" : "var(--accent)"}
            strokeOpacity={s.front ? 0.18 + lit * 0.3 : 0.25}
            strokeWidth=".4" />;
        })}
      </g>
      {segments.length > 0 && [0, 16, 32, 48].map((i) => {
        const a = polar(84, i * 360 / 64);
        const b = polar(80, i * 360 / 64);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--accent)" strokeWidth="1" />;
      })}
      {segments.length === 0 && <circle cx="120" cy="120" r="62" fill="none" stroke="#9fb0c8" strokeOpacity=".3" strokeWidth=".6" strokeDasharray="2 4" />}
      <text x="120" y="109" textAnchor="middle" className="dial-tiny">{hash ? "SLOT" : "AWAITING"}</text>
      <text x="120" y="126" textAnchor="middle" className="dial-label" fill="#e6fff4">{height != null ? formatInteger(height) : "BLOCKHASH"}</text>
      <text x="120" y="139" textAnchor="middle" className="dial-tiny">{hash ? `${hash.slice(-6)}` : "—"}</text>
      <text x="120" y="208" textAnchor="middle" className="dial-tiny">{hash ? "64 DIGITS / WIDTH = VALUE" : "HASH UNAVAILABLE"}</text>
    </DialBezel>
  </DialCanvas>;

  const body = <button type="button" className="dial-copy-button" aria-label="Leader ribbon. Click to copy blockhash." disabled={!hash} onClick={async (event) => {
    event.stopPropagation();
    if (!hash) return;
    try { await navigator.clipboard.writeText(hash); setCopied(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  }}>{art}</button>;

  if (compact) return body;
  if (stage) return <DialStageReadout reading={copied ? "Hash copied" : formatHash(hash)} detail={`${height != null ? `Slot ${formatInteger(height)} · ` : ""}Every digit sets the ribbon's width · Select to copy`}>{body}</DialStageReadout>;
  return <InstrumentFrame title="Ribbon" subtitle={height != null ? `Slot ${formatInteger(height)} blockhash, woven` : "Blockhash woven into a ring"} reading={copied ? "Copied" : formatHash(hash)} large={large} instrumentId="sigil">{body}</InstrumentFrame>;
}
