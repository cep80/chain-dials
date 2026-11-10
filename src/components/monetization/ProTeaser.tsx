"use client";

import Link from "next/link";
import { useChainOptional } from "@/lib/chains/context";
import { PRO_PRICE_LABEL } from "@/lib/pro";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import { useProAccess } from "@/hooks/useProAccess";
import { storePurchasesAvailable } from "@/lib/store-purchase";

export function ProTeaser() {
  const chain = useChainOptional();
  const { pro } = useProAccess();
  const native = useIsNativeApp();
  // In the apps, only upsell when this build can sell through the store.
  if (native && !pro && !storePurchasesAvailable()) return null;
  const href = pro ? "/account" : `/${chain?.slug ?? "btc"}/pro#checkout`;
  return (
    <aside className="rounded-[12px] border border-line bg-ink-elevated p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-accent">Pro</p>
      <h3 className="mt-1 text-lg font-bold text-paper">
        {pro ? "You’re on Pro" : native ? "Watch your coins" : `Watch your coins · ${PRO_PRICE_LABEL}`}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-paper-muted">
        {pro
          ? "Watches on your transactions, wallets, and solo miner, plus wall packs and desk sync. Boards stay free."
          : "Free boards forever. Pro watches your transactions, wallets, and solo miner and tells you when something happens, plus multi-chain wall packs and desk sync."}
      </p>
      <Link
        href={href}
        className="btn-cta mt-4 rounded-full px-4 py-2 text-sm"
      >
        {pro ? "Open account" : "See Pro"}
      </Link>
    </aside>
  );
}
