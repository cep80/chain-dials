"use client";
import { BlockMetronome, HashrateForge, IssuanceHourglass, MempoolAtmosphere, TipSigil } from "@/components/viz/lazy-instruments";

import { FeeTrafficChip } from "@/components/metrics/FeeTrafficChip";
import { MetricRow } from "@/components/metrics/MetricRow";





import { ReadingStatus } from "@/components/status/ReadingStatus";
import { MODULE_BY_ID, metricsForModule } from "@/lib/metrics";
import { useDashboardStore } from "@/lib/store";
import type { ModuleId } from "@/types/metrics";

export function ModuleCard({ id }: { id: ModuleId }) {
  const mod = MODULE_BY_ID[id];
  const live = useDashboardStore((s) => s.live);
  const metrics = metricsForModule(id);

  if (!mod) return null;

  const feedKey = id === "fees" ? "fees" : id === "mempool" ? "mempool" : id === "mining" ? "hashrate" : id === "lightning" ? "lightning" : id === "markets" ? "prices" : "blocks";
  const feed = live.feeds?.[feedKey];
  const retargetFeed = id === "mining" ? live.feeds?.difficulty : null;

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
        <div className="max-w-[45%] text-right text-[10px] text-paper-muted/80">
          <p>{mod.source}</p>
          {id === "mining" ? (
            <div className="space-y-1">
              <p>Hashrate <ReadingStatus updatedAt={feed?.updatedAt ?? null} error={feed?.error} loading={!feed || feed.loading} staleMs={120_000} /></p>
              <p>Retarget <ReadingStatus updatedAt={retargetFeed?.updatedAt ?? null} error={retargetFeed?.error} loading={!retargetFeed || retargetFeed.loading} staleMs={120_000} /></p>
            </div>
          ) : <ReadingStatus updatedAt={feed?.updatedAt ?? null} error={feed?.error} loading={!feed || feed.loading} staleMs={120_000} />}
        </div>
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
