"use client";

import Link from "next/link";
import type { ForensicsCaseId } from "@/lib/forensics/types";

const TABS: Array<{
  id: ForensicsCaseId;
  href: string;
  label: string;
  live?: boolean;
}> = [
  {
    id: "liquid",
    href: "/btc/forensics?case=liquid",
    label: "Liquid peg",
    live: true,
  },
  {
    id: "coldcard",
    href: "/btc/forensics?case=coldcard",
    label: "Coldcard drain",
  },
];

export function ForensicsCaseTabs({ active }: { active: ForensicsCaseId }) {
  return (
    <nav
      aria-label="Trace cases"
      className="flex flex-wrap gap-2"
    >
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-[10px] border px-3 text-xs font-semibold transition ${
              on
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-line text-paper-muted hover:text-paper"
            }`}
          >
            {tab.label}
            {tab.live ? (
              <span className="text-[9px] uppercase tracking-[0.16em] text-warn">
                Live
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
