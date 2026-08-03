import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ColdcardForensics } from "@/components/forensics/ColdcardForensics";
import { AppShell } from "@/components/shell/AppShell";
import { isChainId } from "@/lib/chains/registry";
import { siteUrl, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chain: string }>;
}): Promise<Metadata> {
  const { chain } = await params;
  if (!isChainId(chain) || chain !== "btc") {
    return { title: SITE_NAME };
  }
  const title = "Coldcard drain watch · Chain Dials";
  const description =
    "Live watchboard for known Coldcard RNG drain holdings, victim address lookup, and hop tracing for investigators.";
  const url = `${siteUrl()}/btc/forensics`;
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

export default async function ForensicsPage({
  params,
}: {
  params: Promise<{ chain: string }>;
}) {
  const { chain } = await params;
  if (!isChainId(chain) || chain !== "btc") notFound();

  // AppShell is client; wrap so BTC layout ChainProvider still applies.
  return (
    <AppShell>
      <ColdcardForensics />
    </AppShell>
  );
}
