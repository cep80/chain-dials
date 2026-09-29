"use client";

import { useId, type ReactNode } from "react";
import { useAppReducedMotion } from "@/lib/settings/use-app-reduced-motion";
import { useDocumentVisible } from "@/lib/use-document-visible";

export type DialProps = { compact?: boolean; large?: boolean; stage?: boolean };

export function polar(radius: number, degrees: number, cx = 120, cy = 120) {
  const a = (degrees - 90) * Math.PI / 180;
  return { x: +(cx + Math.cos(a) * radius).toFixed(3), y: +(cy + Math.sin(a) * radius).toFixed(3) };
}

export function dialArc(radius: number, start: number, end: number) {
  const a = polar(radius, start);
  const b = polar(radius, end);
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

/** A responsive vector surface; artwork stays sharp in board, wall and stage modes. */
export function DialCanvas({ children, label, compact, large, stage, wide = false, className = "" }: DialProps & { children: ReactNode; label: string; wide?: boolean; className?: string }) {
  const reduce = useAppReducedMotion();
  const visible = useDocumentVisible();
  return <svg
    className={`dial-canvas ${className}`}
    data-motion={reduce || !visible ? "still" : "live"}
    viewBox={wide ? "0 0 320 240" : "0 0 240 240"}
    style={{ width: stage ? (wide ? 760 : 560) : compact ? (wide ? 140 : 100) : large ? (wide ? 360 : 280) : (wide ? 320 : 240), aspectRatio: wide ? "4 / 3" : "1" }}
    role="img" aria-label={label}
  >{children}</svg>;
}

/** Static optical housing. Light comes from gradients, not a per-frame blur pass. */
export function DialBezel({ children, ticks = 64 }: { children?: ReactNode; ticks?: number }) {
  const uid = useId().replace(/:/g, "");
  return <>
    <defs>
      <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#c3cede" stopOpacity=".48" />
        <stop offset=".24" stopColor="#17212f" />
        <stop offset=".51" stopColor="#080f19" />
        <stop offset=".77" stopColor="#6e8098" stopOpacity=".45" />
        <stop offset="1" stopColor="#0b111b" />
      </linearGradient>
      <radialGradient id={`${uid}-face`} cx="40%" cy="30%" r="75%">
        <stop stopColor="var(--accent)" stopOpacity=".13" />
        <stop offset=".55" stopColor="#0b131f" />
        <stop offset="1" stopColor="#050910" />
      </radialGradient>
      <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2=".7" y2="1">
        <stop stopColor="#e6f0ff" stopOpacity=".09" />
        <stop offset=".5" stopColor="#e6f0ff" stopOpacity="0" />
        <stop offset="1" stopColor="var(--accent)" stopOpacity=".04" />
      </linearGradient>
    </defs>
    <circle cx="120" cy="123" r="112" fill="#000" opacity=".35" />
    <circle cx="120" cy="120" r="111" fill={`url(#${uid}-metal)`} stroke="#a4b9d2" strokeOpacity=".2" strokeWidth=".6" />
    <circle cx="120" cy="120" r="106" fill={`url(#${uid}-face)`} stroke="#02050a" strokeWidth="2" />
    <circle cx="120" cy="120" r="103" fill="none" stroke="#cfddf0" strokeOpacity=".15" strokeWidth=".5" />
    <circle cx="120" cy="120" r="77" fill="none" stroke="var(--accent)" strokeOpacity=".1" strokeWidth=".5" />
    {Array.from({ length: ticks }, (_, i) => {
      const a = polar(i % 4 === 0 ? 94 : 98, i * 360 / ticks);
      const b = polar(101, i * 360 / ticks);
      return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={i % 4 === 0 ? "#b7c7df" : "#53627a"} strokeWidth={i % 4 === 0 ? 1 : .65} opacity={i % 4 === 0 ? .8 : .65} />;
    })}
    {[45, 135, 225, 315].map((a) => {
      const p = polar(109, a);
      return <g key={a}><circle cx={p.x} cy={p.y} r="1.2" fill="#070c14" /><path d={`M ${p.x - .7} ${p.y} h 1.4`} stroke="#8290a5" strokeWidth=".5" /></g>;
    })}
    {children}
    <circle cx="120" cy="120" r="102" fill={`url(#${uid}-glass)`} pointerEvents="none" />
  </>;
}

export function DialStageReadout({ children, reading, detail }: { children: ReactNode; reading: string; detail: string }) {
  return <div className="dial-stage-composition">
    {children}
    <div className="dial-stage-caption"><p className="instrument-stage-reading mono">{reading}</p><p>{detail}</p></div>
  </div>;
}
