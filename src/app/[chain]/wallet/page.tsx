import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { WalletExplorer } from "@/components/wallet/WalletExplorer";
import { CHAINS, isChainId } from "@/lib/chains/registry";
import { siteUrl, SITE_NAME } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chain: string }>;
}): Promise<Metadata> {
  const { chain } = await params;
  if (!isChainId(chain)) return { title: SITE_NAME };
  const c = CHAINS[chain];
  const title = `${c.shortName} wallet · Chain Dials`;
  const description = `Look up a ${c.name} address: public balance, recent activity, and a door to ${c.explorerName}.`;
  const url = `${siteUrl()}/${c.slug}/wallet`;
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

export default function WalletPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <p className="text-paper-muted">Loading wallet explorer…</p>
        }
      >
        <WalletExplorer />
      </Suspense>
    </AppShell>
  );
}
