"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";
import type { ChainId } from "@/lib/chains/types";
import { useChainOptional } from "@/lib/chains/context";

function chainFromPath(pathname: string): ChainId | null {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg && seg in CHAINS) return seg as ChainId;
  return null;
}

export function ChainSwitcher() {
  const pathname = usePathname() ?? "/";
  const ctx = useChainOptional();
  const active = ctx?.id ?? chainFromPath(pathname) ?? "btc";
  const rest = pathname.split("/").filter(Boolean).slice(1);
  const suffix = rest.length ? `/${rest.join("/")}` : "";

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      role="navigation"
      aria-label="Chain switcher"
    >
      {CHAIN_ORDER.map((id) => {
        const c = CHAINS[id];
        const href = `/${id}${suffix}`;
        const on = id === active;
        return (
          <Link
            key={id}
            href={href}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
              on
                ? "text-ink"
                : "text-paper-muted hover:text-paper"
            }`}
            style={
              on
                ? { background: c.accent, color: id === "sol" || id === "hype" ? "#0a0c10" : undefined }
                : { border: "1px solid var(--line)" }
            }
            title={c.name}
          >
            {c.shortName}
          </Link>
        );
      })}
    </div>
  );
}
