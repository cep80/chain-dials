"use client";

import { DialBezel, DialCanvas, DialStageReadout, dialArc, polar, type DialProps } from "@/components/viz/DialPrimitives";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatDuration, formatInteger } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

export function SlotLattice({ large = false, compact = false, stage = false }: DialProps) {
  const timestamp = useDashboardStore((s) => s.live.tipTimestamp);
  const height = useDashboardStore((s) => s.live.blockHeight);
  const epoch = useDashboardStore((s) => s.live.retargetProgress);
  const now = useDashboardStore((s) => s.now);
  const slot = epoch != null && Number.isFinite(epoch) ? Math.min(31, Math.max(0, Math.floor(epoch / 100 * 32))) : null;
  const since = timestamp != null ? Math.max(0, (now - timestamp) / 1000) : null;
  const reading = formatDuration(since);
  const grid = <DialCanvas {...{ large, compact, stage }} label={`Slot lattice. ${slot == null ? "Consensus slot unavailable." : `Consensus slot ${slot + 1} of 32.`} ${reading} since block.`}>
    <DialBezel>
      {Array.from({ length: 32 }, (_, i) => {
        const current = slot === i;
        const done = slot != null && i < slot;
        return <g key={i}>
          {current && <path d={dialArc(86, i * 11.25 + 1.6, (i + 1) * 11.25 - 1.6)} fill="none" stroke="var(--accent)" strokeWidth="14" opacity=".15" />}
          <path d={dialArc(86, i * 11.25 + 1.6, (i + 1) * 11.25 - 1.6)} fill="none" stroke={current ? "#d3deff" : done ? "var(--accent)" : "#273247"} strokeWidth="7" opacity={current ? 1 : done ? .85 : .55} className={current ? "dial-slot-current" : undefined} />
        </g>;
      })}
      {[0, 8, 16, 24].map((v) => { const p = polar(68, v * 11.25); return <text key={v} x={p.x} y={p.y + 2.5} textAnchor="middle" className="dial-tiny">{String(v).padStart(2, "0")}</text>; })}
      <path d="M120 76 L139 106 L120 117 L101 106 Z M101 110 L120 122 L139 110 L120 139 Z" fill="var(--accent)" opacity=".12" stroke="#b4c4ff" strokeWidth=".5" />
      <text x="120" y="125" textAnchor="middle" className="dial-value" fontSize="34">{slot == null ? "—" : String(slot + 1).padStart(2, "0")}</text>
      <text x="120" y="141" textAnchor="middle" className="dial-tiny">OF 32 SLOTS</text>
      <path d="M88 153 H152" stroke="#7083aa" strokeOpacity=".3" strokeWidth=".5" />
      <text x="120" y="169" textAnchor="middle" className="dial-label">{reading}</text>
      <text x="120" y="185" textAnchor="middle" className="dial-tiny">SINCE BLOCK</text>
    </DialBezel>
  </DialCanvas>;
  if (compact) return grid;
  if (stage) return <DialStageReadout reading={reading} detail={`Consensus slot ${slot == null ? "—" : slot + 1} / 32${height != null ? ` · Block ${formatInteger(height)}` : ""}`}>{grid}</DialStageReadout>;
  return <InstrumentFrame title="Lattice" subtitle="32 consensus slots · one complete epoch" reading={reading} large={large} instrumentId="metronome">{grid}</InstrumentFrame>;
}
