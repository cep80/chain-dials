"use client";

import { DialStageReadout, type DialProps } from "@/components/viz/DialPrimitives";
import { FountainDial } from "@/components/viz/FountainDial";
import { InstrumentFrame } from "@/components/viz/InstrumentFrame";
import { formatInteger, formatPlainPercent } from "@/lib/format";
import { useDashboardStore } from "@/lib/store";

/** Inflation spray on a printed 0–8 % scale (extends in 2 % steps if inflation ever exceeds it). */
export function InflationFountain({ large = false, compact = false, stage = false }: DialProps) {
  const epoch = useDashboardStore((s) => s.live.issuanceProgress);
  const inflation = useDashboardStore((s) => s.live.inflationRate);
  const left = useDashboardStore((s) => s.live.retargetBlocks);

  const epochKnown = epoch != null && Number.isFinite(epoch);
  const inflKnown = inflation != null && Number.isFinite(inflation) && inflation >= 0;
  const max = inflKnown ? Math.max(8, Math.ceil(inflation / 2) * 2) : 8;
  const ticks = [0, .25, .5, .75, 1].map((at) => ({ at, label: `${+(max * at).toFixed(1)}%` }));

  const reading = inflKnown ? `${inflation.toFixed(1)}%` : epochKnown ? `Epoch ${formatPlainPercent(epoch, 0)}` : "Awaiting inflation";
  const detail = [
    epochKnown ? `Basin: epoch ${formatPlainPercent(epoch, 1)} complete` : "Epoch unavailable",
    left != null ? `${formatInteger(left)} slots left` : null,
    "Jet height: annual inflation",
  ].filter(Boolean).join(" · ");

  const art = <FountainDial
    {...{ large, compact, stage }}
    label={`Inflation fountain. ${inflKnown ? `Inflation ${inflation.toFixed(1)} percent a year.` : "Inflation unavailable."} ${epochKnown ? `Epoch ${epoch.toFixed(0)} percent complete.` : "Epoch unavailable."}`}
    level={epochKnown ? epoch / 100 : null}
    levelTitle="EPOCH %"
    spray={inflKnown ? inflation / max : null}
    sprayTitle="INFLATION / YR"
    sprayTicks={ticks}
    sprayValue={inflKnown ? `${inflation.toFixed(1)}%` : undefined}
  />;

  if (compact) return art;
  if (stage) return <DialStageReadout reading={reading} detail={detail}>{art}</DialStageReadout>;
  return <InstrumentFrame
    title="Fountain"
    subtitle={epochKnown ? `Basin = epoch ${formatPlainPercent(epoch, 0)} · jet = inflation` : "Basin = epoch · jet = inflation"}
    reading={reading}
    large={large}
    instrumentId="issuance"
  >{art}</InstrumentFrame>;
}
