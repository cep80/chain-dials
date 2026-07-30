import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChainProvider } from "@/lib/chains/context";
import { CHAINS, isChainId } from "@/lib/chains/registry";
import { absoluteShareUrl, boardSharePath } from "@/lib/share/compose";
import { siteUrl, SITE_NAME } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chain: string }>;
}): Promise<Metadata> {
  const { chain } = await params;
  if (!isChainId(chain)) return { title: SITE_NAME };
  const c = CHAINS[chain];
  const title = `${c.name} Dials · Chain Dials`;
  const description = c.hero;
  const url = absoluteShareUrl(boardSharePath(chain));
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

export default async function ChainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ chain: string }>;
}) {
  const { chain } = await params;
  if (!isChainId(chain)) notFound();
  return <ChainProvider chainId={chain}>{children}</ChainProvider>;
}
