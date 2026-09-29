"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DialBezel, DialCanvas, DialStageReadout, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatHash, formatInteger } from "@/lib/format";
import { hashRelief } from "@/lib/dial-geometry";
import { useDashboardStore } from "@/lib/store";

export function BlockMosaic({ large = false, compact = false, stage = false }: DialProps) {
  const hash = useDashboardStore((s) => s.live.tipHash);
  const height = useDashboardStore((s) => s.live.blockHeight);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const cells = useMemo(() => hash ? hashRelief(hash) : [], [hash]);
  const art = <DialCanvas {...{ large, compact, stage }} label={hash ? `Block mosaic. Relief generated from all 64 digits of block ${height ?? ""}'s hash.` : "Block mosaic. Waiting for block hash."}>
    <DialBezel ticks={48}>
      <ellipse cx="120" cy="169" rx="72" ry="14" fill="var(--accent)" opacity=".06" />
      <path d="M25 112 L120 60 L215 112 L120 165 Z" fill="#02050c" stroke="var(--accent)" strokeOpacity=".18" strokeWidth=".7" />
      <g className="dial-relief" key={hash}>
        {cells.map((cell, i) => {
          const x = 120 + (i % 8 - Math.floor(i / 8)) * 11.3;
          const y = 72 + (i % 8 + Math.floor(i / 8)) * 6.05;
          const top = y - cell.lift;
          const hue = 220 + cell.light * 24;
          return <g key={i}>
            <path d={`M${x - 10.6} ${top} L${x} ${top + 5.6} V${y + 5.6} L${x - 10.6} ${y}Z`} fill={`hsl(${hue} 48% ${17 + cell.light * 17}%)`} />
            <path d={`M${x} ${top + 5.6} L${x + 10.6} ${top} V${y} L${x} ${y + 5.6}Z`} fill={`hsl(${hue} 52% ${25 + cell.light * 20}%)`} />
            <path d={`M${x} ${top - 5.6} L${x + 10.6} ${top} L${x} ${top + 5.6} L${x - 10.6} ${top}Z`} fill={`hsl(${hue} 64% ${37 + cell.light * 30}%)`} stroke="#d8e3ff" strokeOpacity=".26" strokeWidth=".35" />
          </g>;
        })}
      </g>
      {!hash && <text x="120" y="123" textAnchor="middle" className="dial-label">AWAITING BLOCK</text>}
      <text x="120" y="183" textAnchor="middle" className="dial-tiny">{hash ? "64 DIGITS / UNIQUE RELIEF" : "HASH UNAVAILABLE"}</text>
      <text x="120" y="198" textAnchor="middle" className="dial-tiny" fill="#c8d5ff">{height != null ? `#${formatInteger(height)}` : "—"}</text>
    </DialBezel>
  </DialCanvas>;
  const body = <button type="button" className="dial-copy-button" aria-label="Block mosaic. Click to copy block hash." disabled={!hash} onClick={async (event) => {
    event.stopPropagation();
    if (!hash) return;
    try { await navigator.clipboard.writeText(hash); setCopied(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  }}>{art}</button>;
  if (compact) return body;
  if (stage) return <DialStageReadout reading={copied ? "Hash copied" : formatHash(hash)} detail="Every block makes a unique relief · Select to copy its hash">{body}</DialStageReadout>;
  return <InstrumentFrame title="Mosaic" subtitle="Block fingerprint · select the relief to copy" reading={copied ? "Copied" : formatHash(hash)} large={large} instrumentId="sigil">{body}</InstrumentFrame>;
}
