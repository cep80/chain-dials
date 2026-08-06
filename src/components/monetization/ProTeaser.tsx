"use client";

import Link from "next/link";
import { useChainOptional } from "@/lib/chains/context";
import { PRO_PRICE_LABEL } from "@/lib/pro";
import { useProAccess } from "@/hooks/useProAccess";

export function ProTeaser() {
  const chain = useChainOptional();
  const { pro } = useProAccess();
  const href = pro ? "/account" : `/${chain?.slug ?? "btc"}/pro#checkout`;
  return (
    <aside className="rounded-[12px] border border-line bg-ink-elevated p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-accent">Pro</p>
      <h3 className="mt-1 text-lg font-bold text-paper">
        {pro ? "You’re on Pro" : `Control room + dials · ${PRO_PRICE_LABEL}`}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-paper-muted">
        {pro
          ? "Wall packs, instrument alerts, desk packs, and layouts on your account. Boards stay free."
          : "Free boards forever. Pro: multi-chain wall packs, instrument-state alerts, desk memory, and layouts."}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:bg-accent hover:text-ink"
      >
        {pro ? "Open account" : "See Pro"}
      </Link>
    </aside>
  );
}
