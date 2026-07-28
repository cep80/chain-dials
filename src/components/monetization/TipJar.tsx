"use client";

const LN_ADDRESS =
  process.env.NEXT_PUBLIC_LN_ADDRESS ?? "tips@example.com";

function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M13 2L4 13h6l-1 9 10-13h-6l1-7z" />
    </svg>
  );
}

export function TipJar() {
  const href = LN_ADDRESS.includes("@")
    ? `lightning:${LN_ADDRESS}`
    : LN_ADDRESS.startsWith("lnbc")
      ? `lightning:${LN_ADDRESS}`
      : LN_ADDRESS;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
      title={`Tip via Lightning · ${LN_ADDRESS}`}
    >
      <BoltIcon />
      Tip sats
    </a>
  );
}
