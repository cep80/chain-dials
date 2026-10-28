"use client";

import { DialStageReadout, type DialProps } from "@/components/viz/DialPrimitives";
import { FountainDial } from "@/components/viz/FountainDial";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

/** 24h notional volume on a printed $0–10B scale (extends in $5B steps on heavy days). */
export function VolumeFountain({ large = false, compact = false, stage = false }: DialProps) {
  const supply = useDashboardStore((s) => s.live.supplyProgress);
  // The HYPE adapter carries 24h notional volume, in $B, on inflationRate.
  const dayVlmB = useDashboardStore((s) => s.live.inflationRate);

  const supplyKnown = supply != null && Number.isFinite(supply);
  const vlmKnown = dayVlmB != null && Number.isFinite(dayVlmB) && dayVlmB >= 0;
  const max = vlmKnown ? Math.max(10, Math.ceil(dayVlmB / 5) * 5) : 10;
  const ticks = [0, .5, 1].map((at) => ({ at, label: `$${+(max * at).toFixed(1)}B` }));

  const reading = vlmKnown ? `$${dayVlmB.toFixed(1)}B` : "Awaiting volume";
  const detail = [
    "Jet height: 24h perp notional",
    supplyKnown ? `Basin: circulating supply ${formatPlainPercent(supply, 1)} of reported max` : "Supply feed unavailable",
  ].join(" · ");

  const art = <FountainDial
    {...{ large, compact, stage }}
    label={`Volume fountain. ${vlmKnown ? `Day volume ${dayVlmB.toFixed(1)} billion dollars.` : "Day volume unavailable."} ${supplyKnown ? `Circulating supply ${supply.toFixed(0)} percent of reported max.` : "Supply unavailable."}`}
    level={supplyKnown ? supply / 100 : null}
    levelTitle="SUPPLY %"
    spray={vlmKnown ? dayVlmB / max : null}
    sprayTitle="24H NOTIONAL"
    sprayTicks={ticks}
    sprayValue={vlmKnown ? `$${dayVlmB.toFixed(1)}B` : undefined}
  />;

  if (compact) return art;
  if (stage) return <DialStageReadout reading={reading} detail={detail}>{art}</DialStageReadout>;
  return <InstrumentFrame
    title="Fountain"
    subtitle={supplyKnown ? "Basin = supply issued · jet = 24h volume" : "Supply feed unavailable · jet = 24h volume"}
    reading={reading}
    large={large}
    instrumentId="issuance"
  >{art}</InstrumentFrame>;
}
