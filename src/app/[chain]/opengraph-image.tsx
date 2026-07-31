import { CHAINS, isChainId } from "@/lib/chains/registry";
import { fetchTip } from "@/lib/chains/fetch";
import { fetchChainSnapshot } from "@/lib/chains/snapshot";
import { formatDuration, formatFee } from "@/lib/format";
import { OG_SIZE, renderShareCard } from "@/lib/share/og-card";

export const runtime = "edge";
export const alt = "Chain Dials board";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ chain: string }>;
}) {
  const { chain } = await params;
  if (!isChainId(chain)) {
    return renderShareCard({
      brand: "Chain",
      chainLabel: "?",
      title: "Board",
      headline: "Chain Dials",
      sub: "Live dials. Pick a board.",
      accent: "#f7931a",
    });
  }
  const c = CHAINS[chain];
  let headline = c.shortName;
  let sub = c.blurb;
  try {
    if (chain === "btc") {
      const tip = await fetchTip("btc");
      const since =
        tip.timestamp != null
          ? formatDuration(Math.max(0, (Date.now() - tip.timestamp) / 1000))
          : "-";
      const feesRes = await fetch(
        "https://mempool.space/api/v1/fees/recommended",
        { next: { revalidate: 0 } },
      );
      const fees = feesRes.ok
        ? ((await feesRes.json()) as { fastestFee?: number })
        : null;
      headline = since;
      sub = `since tip · fee ${formatFee(fees?.fastestFee, "sat/vB")}`;
    } else {
      const snap = await fetchChainSnapshot(chain);
      headline = formatDuration(
        snap.tip.timestamp != null
          ? Math.max(0, (Date.now() - snap.tip.timestamp) / 1000)
          : null,
      );
      sub = `since tip · fee ${formatFee(snap.feeFastest, c.feeUnit)}`;
    }
  } catch {
    // keep
  }
  return renderShareCard({
    brand: "Chain",
    chainLabel: c.shortName,
    title: `${c.name} board`,
    headline,
    sub,
    accent: c.accent,
  });
}
