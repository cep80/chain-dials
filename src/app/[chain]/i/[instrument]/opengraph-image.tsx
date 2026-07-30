import { CHAINS, isChainId } from "@/lib/chains/registry";
import { isInstrumentId } from "@/lib/share/compose";
import { OG_SIZE, renderShareCard } from "@/lib/share/og-card";
import { readingForInstrument } from "@/lib/share/readings";
import { SITE_NAME } from "@/lib/site";

export const runtime = "edge";
export const alt = "Chain Dials instrument share card";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ chain: string; instrument: string }>;
}) {
  const { chain, instrument } = await params;
  if (!isChainId(chain) || !isInstrumentId(instrument)) {
    return renderShareCard({
      brand: "Chain",
      chainLabel: "?",
      title: "Instrument",
      headline: "Chain Dials",
      sub: "Network observatory",
      accent: "#f7931a",
    });
  }
  const c = CHAINS[chain];
  const meta = c.instruments[instrument];
  let headline = "live";
  let sub = meta.subtitle;
  let accent = c.accent;
  try {
    const r = await readingForInstrument(chain, instrument);
    headline = r.headline;
    sub = r.sub;
    accent = r.accent;
  } catch {
    // keep
  }
  return renderShareCard({
    brand: "Chain",
    chainLabel: c.shortName,
    title: meta.frameTitle,
    headline,
    sub,
    accent,
  });
}
