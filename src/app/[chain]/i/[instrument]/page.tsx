import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareInstrumentClient } from "@/components/share/ShareInstrumentClient";
import { CHAINS, isChainId } from "@/lib/chains/registry";
import { isInstrumentId } from "@/lib/share/compose";
import { readingForInstrument } from "@/lib/share/readings";
import { absoluteShareUrl, instrumentSharePath } from "@/lib/share/compose";
import { siteUrl, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chain: string; instrument: string }>;
}): Promise<Metadata> {
  const { chain, instrument } = await params;
  if (!isChainId(chain) || !isInstrumentId(instrument)) {
    return { title: SITE_NAME };
  }
  const c = CHAINS[chain];
  const meta = c.instruments[instrument];
  let reading = "live";
  try {
    const r = await readingForInstrument(chain, instrument);
    reading = r.headline;
  } catch {
    // keep
  }
  const title = `${c.shortName} ${meta.frameTitle}: ${reading}`;
  const description = meta.subtitle;
  const url = absoluteShareUrl(instrumentSharePath(chain, instrument));
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
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: "@chaindials",
    },
    metadataBase: new URL(siteUrl()),
  };
}

export default async function InstrumentSharePage({
  params,
}: {
  params: Promise<{ chain: string; instrument: string }>;
}) {
  const { chain, instrument } = await params;
  if (!isChainId(chain) || !isInstrumentId(instrument)) notFound();

  let headline = "live";
  let sub = CHAINS[chain].instruments[instrument].subtitle;
  try {
    const r = await readingForInstrument(chain, instrument);
    headline = r.headline;
    sub = r.sub;
  } catch {
    // keep
  }

  return (
    <ShareInstrumentClient
      chainId={chain}
      instrument={instrument}
      headline={headline}
      sub={sub}
    />
  );
}
