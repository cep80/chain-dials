import { OG_SIZE, renderShareCard } from "@/lib/share/og-card";

export const runtime = "edge";
export const alt = "Chain Dials";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderShareCard({
    brand: "Chain",
    chainLabel: "Suite",
    title: "Chain Dials",
    headline: "BTC · ETH · SOL · HYPE",
    sub: "Live dials. Pick a board.",
    accent: "#f7931a",
  });
}
