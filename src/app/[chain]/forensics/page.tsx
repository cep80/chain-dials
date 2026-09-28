import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ColdcardForensics } from "@/components/forensics/ColdcardForensics";
import { LiquidForensics } from "@/components/forensics/LiquidForensics";
import { AppShell } from "@/components/shell/AppShell";
import { isChainId } from "@/lib/chains/registry";
import { parseForensicsCase } from "@/lib/forensics/liquid";
import { siteUrl, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

function caseFromSearch(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseForensicsCase(value);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ chain: string }>;
  searchParams: Promise<{ case?: string | string[] }>;
}): Promise<Metadata> {
  const { chain } = await params;
  if (!isChainId(chain) || chain !== "btc") {
    return { title: SITE_NAME };
  }
  const sp = await searchParams;
  const liquid = caseFromSearch(sp.case) === "liquid";
  const title = liquid
    ? "Liquid peg drain · Chain Dials"
    : "Coldcard drain watch · Chain Dials";
  const description = liquid
    ? "Live watchboard for the September 2026 Liquid Network peg-out: actor wallet, federation reserve, return tx, and hop tracing."
    : "Live watchboard for known Coldcard RNG drain holdings, victim address lookup, and hop tracing for investigators.";
  const url = liquid
    ? `${siteUrl()}/btc/forensics?case=liquid`
    : `${siteUrl()}/btc/forensics`;
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
  searchParams,
}: {
  params: Promise<{ chain: string }>;
  searchParams: Promise<{ case?: string | string[] }>;
}) {
  const { chain } = await params;
  if (!isChainId(chain) || chain !== "btc") notFound();
  const sp = await searchParams;
  const liquid = caseFromSearch(sp.case) === "liquid";

  return (
    <AppShell>
      {liquid ? <LiquidForensics /> : <ColdcardForensics />}
    </AppShell>
  );
}
