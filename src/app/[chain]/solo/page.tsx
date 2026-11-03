import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SoloOddsBoard } from "@/components/mining/SoloOddsBoard";
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
  const title = "Solo mining odds · Chain Dials";
  const description =
    "Live solo mining chances for every class of Bitcoin miner, from a Bitaxe to a hydro rack, recomputed from current difficulty.";
  const url = `${siteUrl()}/btc/solo`;
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
  };
}

export default async function SoloOddsPage({
  params,
}: {
  params: Promise<{ chain: string }>;
}) {
  const { chain } = await params;
  if (!isChainId(chain) || chain !== "btc") notFound();
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Mining · Solo odds</p>
        <h1 className="mt-2 text-3xl font-extrabold text-paper">What are my odds solo?</h1>
        <p className="mt-2 max-w-2xl text-paper-muted">
          Your chance of finding a whole block alone, for every kind of miner out there. Updates live as difficulty
          and hashrate move.
        </p>
        <div className="mt-8">
          <SoloOddsBoard />
        </div>
      </div>
    </AppShell>
  );
}
