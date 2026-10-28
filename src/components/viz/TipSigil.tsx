"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DialBezel, DialCanvas, DialStageReadout, polar, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { hashNibbles } from "@/lib/dial-geometry";
import { keyLight } from "@/lib/dial-light";
import { arcPath, buildSigil } from "@/lib/hash-sigil";
import { formatHash, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

const SIZE = 120;
/** The sigil is built on a 120 grid; this places it on the 240 dial face. */
const PLACE = "translate(120 120) scale(1.42) translate(-60 -60)";
const METAL = "#d6deea";
const SHADE = "#000";

/**
 * Hash glyph engraved on a bezel face. The inner sigil follows buildSigil;
 * the outer ring carries all 64 digits as tick lengths so no byte is dropped.
 */
export function TipSigil({ large = false, compact = false, stage = false }: DialProps) {
  const hash = useDashboardStore((s) => s.live.tipHash);
  const height = useDashboardStore((s) => s.live.blockHeight);
  const uid = useId().replace(/:/g, "");
  const light = keyLight();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const geom = useMemo(() => buildSigil(hash, SIZE), [hash]);
  const digits = useMemo(() => hash ? hashNibbles(hash) : [], [hash]);

  const lines = geom.segments.filter((s) => s.type === "line" || s.type === "chord");
  const arcs = geom.segments.filter((s) => s.type === "arc" && s.r != null && s.start != null && s.end != null);
  const dots = geom.segments.filter((s) => s.type === "dot");

  /** Each stroke is cut twice: a shadow offset away from the key light, then the lit metal. */
  const engrave = (lit: boolean) => {
    const colour = (accent: boolean) => lit ? (accent ? "var(--accent)" : METAL) : SHADE;
    const op = (base: number) => lit ? base : .55;
    return <g transform={lit ? undefined : "translate(.35 .5)"}>
      {geom.rings.map((r, i) => <circle key={`r${i}`} cx="60" cy="60" r={r} fill="none" stroke={lit ? "#7c8ca6" : SHADE} strokeOpacity={lit ? .45 : .4} strokeWidth=".45" />)}
      {lines.map((s, i) => <line key={`l${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={colour(s.accent)} strokeWidth={s.weight * .8} strokeLinecap="round" opacity={op(s.type === "chord" ? .7 : .92)} />)}
      {arcs.map((s, i) => <path key={`a${i}`} d={arcPath(s.x1, s.y1, s.r!, s.start!, s.end!)} fill="none" stroke={colour(s.accent)} strokeWidth={s.weight * .95} strokeLinecap="round" opacity={op(.95)} />)}
      {dots.map((s, i) => <circle key={`d${i}`} cx={s.x1} cy={s.y1} r={(s.r ?? 1.5) * .85} fill={colour(s.accent)} opacity={op(1)} />)}
    </g>;
  };

  const art = <DialCanvas {...{ large, compact, stage }} label={hash ? `Block sigil for block ${height ?? ""}. A glyph engraved from the block hash; the outer ring encodes all 64 digits. Select to copy the hash.` : "Block sigil. Waiting for the next block."}>
    <defs>
      <radialGradient id={`${uid}-plate`} cx={light.cx} cy={light.cy} r="75%"><stop stopColor="#1b2433" /><stop offset=".6" stopColor="#0a1019" /><stop offset="1" stopColor="#05080d" /></radialGradient>
      <radialGradient id={`${uid}-glow`}><stop stopColor="var(--accent)" stopOpacity=".16" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
    </defs>
    <DialBezel ticks={48}>
      <circle cx="120" cy="120" r="84" fill={`url(#${uid}-plate)`} stroke="#02050a" strokeWidth="1.2" />
      <circle cx="120" cy="120" r="83" fill="none" stroke="#cfdcf0" strokeOpacity=".12" strokeWidth=".6" />
      <circle cx="120" cy="120" r="80" fill={`url(#${uid}-glow)`} />

      {digits.map((n, i) => {
        const a = polar(88.5, i * 360 / 64);
        const b = polar(88.5 + 1.6 + n * .42, i * 360 / 64);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={n > 11 ? "var(--accent)" : "#9fb0c8"} strokeOpacity={n > 11 ? .95 : .35 + n / 40} strokeWidth="1.1" strokeLinecap="round" />;
      })}

      {hash
        ? <g transform={PLACE} className="dial-relief" key={geom.seed}>{engrave(false)}{engrave(true)}</g>
        : <>
          <circle cx="120" cy="120" r="52" fill="none" stroke="#9fb0c8" strokeOpacity=".3" strokeWidth=".6" strokeDasharray="2 4" />
          <text x="120" y="123" textAnchor="middle" className="dial-tiny">AWAITING BLOCK</text>
        </>}
      <text x="120" y="210" textAnchor="middle" className="dial-tiny">{height != null ? `#${formatInteger(height)}` : "HASH UNAVAILABLE"}</text>
    </DialBezel>
  </DialCanvas>;

  const body = <button type="button" className="dial-copy-button" aria-label="Block sigil. Click to copy block hash." disabled={!hash} onClick={async (event) => {
    event.stopPropagation();
    if (!hash) return;
    try { await navigator.clipboard.writeText(hash); setCopied(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  }}>{art}</button>;

  if (compact) return body;
  if (stage) return <DialStageReadout reading={height != null ? formatInteger(height) : "—"} detail={`${copied ? "Hash copied" : formatHash(hash)} · Engraved from the block hash · Select to copy`}>{body}</DialStageReadout>;
  return <InstrumentFrame title="Block Sigil" subtitle={height != null ? `Block ${formatInteger(height)} glyph` : "Glyph from the block hash"} reading={copied ? "Copied" : formatHash(hash)} large={large} instrumentId="sigil">{body}</InstrumentFrame>;
}
