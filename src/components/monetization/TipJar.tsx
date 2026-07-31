"use client";

import { Hint } from "@/components/ui/Hint";

const LN_ADDRESS = process.env.NEXT_PUBLIC_LN_ADDRESS?.trim() ?? "";
const PLACEHOLDER = !LN_ADDRESS || LN_ADDRESS === "tips@example.com";

function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M13 2L4 13h6l-1 9 10-13h-6l1-7z" />
    </svg>
  );
}

/** Suite Lightning support control. Same rail on every board. */
export function TipJar({ label = "Send sats" }: { label?: string }) {
  if (PLACEHOLDER) {
    return (
      <Hint tip="tip.jar">
        <span
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-paper-muted"
          title="Set NEXT_PUBLIC_LN_ADDRESS to enable Lightning support"
        >
          <BoltIcon />
          Support coming soon
        </span>
      </Hint>
    );
  }

  const href = LN_ADDRESS.includes("@")
    ? `lightning:${LN_ADDRESS}`
    : LN_ADDRESS.startsWith("lnbc")
      ? `lightning:${LN_ADDRESS}`
      : LN_ADDRESS;

  return (
    <Hint tip="tip.jar">
      <a
        href={href}
        className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
      >
        <BoltIcon />
        {label}
      </a>
    </Hint>
  );
}
