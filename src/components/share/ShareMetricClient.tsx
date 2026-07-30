"use client";

import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { ShareBar } from "@/components/share/ShareBar";
import { CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import { METRIC_BY_ID } from "@/lib/metrics";
import { getMetricDisplay, useDashboardStore } from "@/lib/store";
import type { MetricId } from "@/types/metrics";

export function ShareMetricClient({
  chainId,
  metric,
}: {
  chainId: ChainId;
  metric: MetricId;
}) {
  const chain = CHAINS[chainId];
  const def = METRIC_BY_ID[metric]!;
  const live = useDashboardStore((s) => s.live);
  const now = useDashboardStore((s) => s.now);
  const display = getMetricDisplay(live, now, metric);

  return (
    <AppShell>
      <div className="mx-auto max-w-xl">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">
          Shared reading · {chain.shortName}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-paper">{def.label}</h1>
        <p className="mt-2 text-sm text-paper-muted">{def.definition}</p>
        <p className="mono mt-6 text-4xl text-accent md:text-5xl">{display}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ShareBar
            target={{
              kind: "metric",
              chainId,
              metric,
              display,
            }}
          />
          <Link
            href={`/${chain.slug}`}
            className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-paper-muted transition hover:border-accent hover:text-paper"
          >
            Open board
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
