import Link from "next/link";

export function ProTeaser() {
  return (
    <aside className="rounded-[12px] border border-line bg-ink-elevated p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-accent">Pro</p>
      <h3 className="mt-1 text-lg font-bold text-paper">Alerts + Wall Mode</h3>
      <p className="mt-2 text-sm leading-relaxed text-paper-muted">
        Fee spikes, stagnant tips, and a five-instrument kiosk wall — without
        paywalling the live board. Checkout isn’t live; waitlist is open.
      </p>
      <Link
        href="/pro#waitlist"
        className="mt-4 inline-flex rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:bg-accent hover:text-ink"
      >
        Join waitlist
      </Link>
    </aside>
  );
}
