"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DialCanvas, DialStageReadout, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { hashNibbles } from "@/lib/dial-geometry";
import { formatHash, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

const COLS = 32;
const LEFT = 26;
const PITCH = 8.5;
/** Hole rows, top to bottom: bits 8, 4 · sprocket · bits 2, 1 (paper-tape layout). */
const BIT_ROWS = [{ bit: 8, dy: 9 }, { bit: 4, dy: 17 }, { bit: 2, dy: 31 }, { bit: 1, dy: 39 }];
const SPROCKET_DY = 24;
const STRIP_H = 48;
const STRIPS = [62, 128];

/**
 * The block hash punched into two strips of paper tape. Each column is one
 * hex digit: four holes for its bits, so every digit, zeros included, shows.
 */
export function HashTape({ large = false, compact = false, stage = false }: DialProps) {
  const hash = useDashboardStore((s) => s.live.tipHash);
  const height = useDashboardStore((s) => s.live.blockHeight);
  const uid = useId().replace(/:/g, "");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const digits = useMemo(() => hash ? hashNibbles(hash) : null, [hash]);
  const hex = hash ? hash.replace(/^0x/i, "").toLowerCase().padEnd(64, "0").slice(0, 64) : "";

  const art = <DialCanvas {...{ large, compact, stage }} wide label={hash ? `Hash tape. Block ${height ?? ""}'s hash punched as 64 four-bit columns.` : "Hash tape. Waiting for block hash."}>
    <defs>
      <linearGradient id={`${uid}-chamber`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#142629" /><stop offset=".6" stopColor="#070d10" /><stop offset="1" stopColor="#122226" /></linearGradient>
      <linearGradient id={`${uid}-tape`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1f2c33" /><stop offset=".12" stopColor="#141d23" /><stop offset=".88" stopColor="#10181d" /><stop offset="1" stopColor="#0a1014" /></linearGradient>
      <radialGradient id={`${uid}-hole`}><stop stopColor="#f2fffb" /><stop offset=".45" stopColor="var(--accent)" /><stop offset="1" stopColor="var(--accent)" stopOpacity=".2" /></radialGradient>
      <radialGradient id={`${uid}-backlight`} cy="50%" r="60%"><stop stopColor="var(--accent)" stopOpacity=".16" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
    </defs>
    <path d="M17 18 H303 L314 29 V204 L301 219 H19 L6 206 V29 Z" fill={`url(#${uid}-chamber)`} stroke="#7a8fac" strokeOpacity=".35" strokeWidth=".7" />
    <path d="M19 22 H301 M10 33 V198 M19 215 H299" fill="none" stroke="#e1ebff" strokeOpacity=".14" strokeWidth=".6" />
    <ellipse cx="160" cy="120" rx="150" ry="80" fill={`url(#${uid}-backlight)`} />
    <text x="25" y="37" className="dial-tiny">HASH TAPE</text>
    <text x="294" y="37" textAnchor="end" className="dial-tiny">{height != null ? `BLOCK ${formatInteger(height)}` : "BLOCK —"}</text>

    {STRIPS.map((top, s) => <g key={top} className="dial-relief" transform={s ? undefined : undefined}>
      <rect x={LEFT - 10} y={top + 3} width={COLS * PITCH + 20} height={STRIP_H} rx="1.5" fill="#000" opacity=".35" />
      <path d={`M${LEFT - 10} ${top} H${LEFT + COLS * PITCH + 10} l-3 ${STRIP_H / 2} l3 ${STRIP_H / 2} H${LEFT - 10} l3 ${-STRIP_H / 2}Z`} fill={`url(#${uid}-tape)`} stroke="#9fb6c4" strokeOpacity=".25" strokeWidth=".5" />
      <path d={`M${LEFT - 8} ${top + .8} H${LEFT + COLS * PITCH + 8}`} stroke="#e6f3f7" strokeOpacity=".16" strokeWidth=".6" />
      {Array.from({ length: COLS }, (_, c) => {
        const cx = LEFT + c * PITCH + PITCH / 2;
        const n = digits?.[s * COLS + c] ?? 0;
        return <g key={c}>
          <circle cx={cx} cy={top + SPROCKET_DY} r=".9" fill="#03070a" stroke="#9fb6c4" strokeOpacity=".3" strokeWidth=".3" />
          {BIT_ROWS.map(({ bit, dy }) => digits && (n & bit)
            ? <g key={bit}><circle cx={cx} cy={top + dy} r="3.6" fill="var(--accent)" opacity=".14" /><circle cx={cx} cy={top + dy} r="2.1" fill={`url(#${uid}-hole)`} /></g>
            : <circle key={bit} cx={cx} cy={top + dy} r="1.9" fill="none" stroke="#9fb6c4" strokeOpacity=".12" strokeWidth=".35" />)}
          {(c % 4 === 0) && <path d={`M${cx - PITCH / 2} ${top + 3} V${top + STRIP_H - 3}`} stroke="#9fb6c4" strokeOpacity=".07" strokeWidth=".4" />}
        </g>;
      })}
      <text y={top + STRIP_H + 11} className="dial-tiny" fill="#c9e9e2">
        {Array.from({ length: COLS }, (_, c) => <tspan key={c} x={LEFT + c * PITCH + PITCH / 2} textAnchor="middle" opacity={hex ? (c % 4 === 0 ? 1 : .7) : .3}>{hex ? hex[s * COLS + c] : "·"}</tspan>)}
      </text>
    </g>)}

    {[{ k: "8", dy: 9 }, { k: "4", dy: 17 }, { k: "2", dy: 31 }, { k: "1", dy: 39 }].map(({ k, dy }) => <text key={k} x="12" y={STRIPS[0]! + dy + 2} className="dial-tiny" opacity=".55">{k}</text>)}
    {!hash && <text x="160" y="124" textAnchor="middle" className="dial-label">AWAITING BLOCK</text>}
    <text x="25" y="206" className="dial-tiny">{hash ? "64 DIGITS / 4-BIT PUNCH" : "HASH UNAVAILABLE"}</text>
    <text x="293" y="206" textAnchor="end" className="dial-tiny">{copied ? "COPIED" : "SELECT TO COPY"}</text>
  </DialCanvas>;

  const body = <button type="button" className="dial-copy-button dial-copy-wide" aria-label="Hash tape. Click to copy block hash." disabled={!hash} onClick={async (event) => {
    event.stopPropagation();
    if (!hash) return;
    try { await navigator.clipboard.writeText(hash); setCopied(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  }}>{art}</button>;

  if (compact) return body;
  if (stage) return <DialStageReadout reading={copied ? "Hash copied" : formatHash(hash)} detail={`${height != null ? `Block ${formatInteger(height)} · ` : ""}Each column is one hex digit, punched in binary · Select to copy`}>{body}</DialStageReadout>;
  return <InstrumentFrame title="Tape" subtitle={height != null ? `Block ${formatInteger(height)} punched tape` : "Block hash on punched tape"} reading={copied ? "Copied" : formatHash(hash)} large={large} instrumentId="sigil">{body}</InstrumentFrame>;
}
