import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WatchBoard } from "@/components/watch/WatchBoard";
import { AppShell } from "@/components/shell/AppShell";
import { isChainId } from "@/lib/chains/registry";
import { siteUrl, SITE_NAME } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chain: string }>;
}): Promise<Metadata> {
  const { chain } = await params;
  if (!isChainId(chain) || chain !== "btc") return { title: SITE_NAME };
  const title = "Watch your transactions, wallets and miner · Chain Dials";
  const description =
    "Get a phone or Telegram notification when your Bitcoin transaction confirms or gets stuck, your wallet moves, or your solo miner finds a block.";
  const url = `${siteUrl()}/btc/watch`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ chain: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { chain } = await params;
  if (!isChainId(chain) || chain !== "btc") notFound();
  const query = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const kind = one(query.kind);
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Watch</p>
        <h1 className="mt-2 text-3xl font-extrabold text-paper">We&apos;ll tell you when it happens</h1>
        <p className="mt-2 max-w-2xl text-paper-muted">
          Watch a transaction until it settles, a wallet for money in or out, or your solo miner&apos;s payout
          address for the block you&apos;re hoping for. Chain Dials checks every minute, even with the app closed.
        </p>
        <div className="mt-8">
          <WatchBoard
            initialKind={kind === "tx" || kind === "address" || kind === "solo" ? kind : "tx"}
            initialTarget={one(query.target).slice(0, 120)}
            initialThs={one(query.ths).slice(0, 20)}
          />
        </div>
      </div>
    </AppShell>
  );
}
