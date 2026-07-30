import { OG_SIZE, renderShareCard } from "@/lib/share/og-card";

export const runtime = "edge";
export const alt = "Chain Dials";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderShareCard({
    brand: "Chain",
    chainLabel: "Suite",
    title: "Three toys",
    headline: "BTC · ETH · SOL",
    sub: "Same habit. Different dials.",
    accent: "#f7931a",
  });
}
