"use client";

import { FeeTrafficChip } from "@/components/metrics/FeeTrafficChip";
import { MetricRow } from "@/components/metrics/MetricRow";
import { BlockMetronome } from "@/components/viz/BlockMetronome";
import { HashrateForge } from "@/components/viz/HashrateForge";
import { IssuanceHourglass } from "@/components/viz/IssuanceHourglass";
import { MempoolAtmosphere } from "@/components/viz/MempoolAtmosphere";
import { TipSigil } from "@/components/viz/TipSigil";
import { formatRelativeAge } from "@/lib/format";
import { MODULE_BY_ID, metricsForModule } from "@/lib/metrics";
import { useDashboardStore } from "@/lib/store";
import type { ModuleId } from "@/types/metrics";

export function ModuleCard({ id }: { id: ModuleId }) {
  const mod = MODULE_BY_ID[id];
  const live = useDashboardStore((s) => s.live);
  const metrics = metricsForModule(id);

  if (!mod) return null;

  const updatedAt =
    id === "lightning"
      ? live.lnUpdatedAt
      : Math.max(live.lastRestAt ?? 0, live.lastWsAt ?? 0) || null;

  const showViz =
    id === "halving" ||
    id === "supply" ||
    id === "mempool" ||
    id === "mining" ||
    id === "blockchain";

  return (
    <section
      aria-labelledby={`module-${id}`}
      className="break-inside-avoid overflow-hidden rounded-[12px] border border-line bg-ink-elevated/70"
    >
      <header className="flex items-start justify-between gap-3 border-b border-line px-3 py-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 id={`module-${id}`} className="text-sm font-bold text-paper">
              {mod.title}
            </h3>
            {id === "fees" && <FeeTrafficChip />}
          </div>
          <p className="mt-0.5 text-[11px] text-paper-muted">{mod.description}</p>
        </div>
        <p className="shrink-0 text-[10px] text-paper-muted/80">
          {mod.source} · {formatRelativeAge(updatedAt)}
        </p>
      </header>

      {showViz && (
        <div className="flex items-center justify-center border-b border-line/60 px-3 py-3">
          {id === "blockchain" && (
            <div className="flex w-full items-center justify-around gap-2">
              <BlockMetronome compact />
              <TipSigil compact />
            </div>
          )}
          {id === "mempool" && (
            <div className="w-full">
              <MempoolAtmosphere compact />
            </div>
          )}
          {(id === "halving" || id === "supply") && (
            <IssuanceHourglass compact />
          )}
          {id === "mining" && <HashrateForge compact />}
        </div>
      )}

      <div>
        {metrics.map((m) => (
          <MetricRow key={m.id} id={m.id} />
        ))}
      </div>
    </section>
  );
}
