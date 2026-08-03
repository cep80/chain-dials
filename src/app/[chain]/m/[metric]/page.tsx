import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareMetricClient } from "@/components/share/ShareMetricClient";
import { CHAINS, isChainId } from "@/lib/chains/registry";
import { METRIC_BY_ID } from "@/lib/metrics";
import {
  absoluteShareUrl,
  metricSharePath,
} from "@/lib/share/compose";
import { siteUrl, SITE_NAME } from "@/lib/site";
import type { MetricId } from "@/types/metrics";

export const dynamic = "force-dynamic";

function isMetricId(v: string): v is MetricId {
  return v in METRIC_BY_ID;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chain: string; metric: string }>;
}): Promise<Metadata> {
  const { chain, metric } = await params;
  // Metric catalog + copy are Bitcoin-shaped; alt boards use instrument share instead.
  if (!isChainId(chain) || chain !== "btc" || !isMetricId(metric)) {
    return { title: SITE_NAME };
  }
  const c = CHAINS[chain];
  const def = METRIC_BY_ID[metric]!;
  const title = `${c.shortName} · ${def.label}`;
  const description = def.definition;
  const url = absoluteShareUrl(metricSharePath(chain, metric));
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    metadataBase: new URL(siteUrl()),
  };
}

export default async function MetricSharePage({
  params,
}: {
  params: Promise<{ chain: string; metric: string }>;
}) {
  const { chain, metric } = await params;
  if (!isChainId(chain) || chain !== "btc" || !isMetricId(metric)) notFound();
  return <ShareMetricClient chainId={chain} metric={metric} />;
}
