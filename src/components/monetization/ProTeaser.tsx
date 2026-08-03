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
        {pro ? "You’re on Pro" : `Alerts + history · ${PRO_PRICE_LABEL}`}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-paper-muted">
        {pro
          ? "Manage billing, saved layouts, and alert rules from your account."
          : "Synced alert rules, longer price ranges, CSV export, and named pinboards. Wall mode stays free."}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:bg-accent hover:text-ink"
      >
        {pro ? "Open account" : "Get Pro"}
      </Link>
    </aside>
  );
}
