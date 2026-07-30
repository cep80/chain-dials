import { CHAINS, isChainId } from "@/lib/chains/registry";
import { METRIC_BY_ID } from "@/lib/metrics";
import { OG_SIZE, renderShareCard } from "@/lib/share/og-card";
import type { MetricId } from "@/types/metrics";

export const runtime = "edge";
export const alt = "Chain Dials metric share card";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ chain: string; metric: string }>;
}) {
  const { chain, metric } = await params;
  if (!isChainId(chain) || !(metric in METRIC_BY_ID)) {
    return renderShareCard({
      brand: "Chain",
      chainLabel: "?",
      title: "Metric",
      headline: "Chain Dials",
      sub: "Network reading",
      accent: "#f7931a",
    });
  }
  const c = CHAINS[chain];
  const def = METRIC_BY_ID[metric as MetricId]!;
  return renderShareCard({
    brand: "Chain",
    chainLabel: c.shortName,
    title: def.label,
    headline: def.label,
    sub: def.definition.slice(0, 120),
    accent: c.accent,
  });
}
