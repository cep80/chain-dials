"use client";

import Link from "next/link";
import { useChainOptional } from "@/lib/chains/context";

export function ProTeaser() {
  const chain = useChainOptional();
  const href = `/${chain?.slug ?? "btc"}/pro#waitlist`;
  return (
    <aside className="rounded-[12px] border border-line bg-ink-elevated p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-accent">Pro</p>
      <h3 className="mt-1 text-lg font-bold text-paper">Alerts + Wall</h3>
      <p className="mt-2 text-sm leading-relaxed text-paper-muted">
        Fee alerts when conditions change, or the full instrument wall on a
        second screen. We’re not charging yet — waitlist only.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:bg-accent hover:text-ink"
      >
        Join the waitlist
      </Link>
    </aside>
  );
}
