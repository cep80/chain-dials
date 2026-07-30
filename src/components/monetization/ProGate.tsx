import Link from "next/link";

export function ProGate({
  title,
  detail = "The free board stays free. Pro will add alerts, a full wall, longer history, and saved layouts. Not a padlock on the numbers.",
  ctaLabel = "Join the Pro waitlist",
  ctaHref = "/btc/pro#waitlist",
  children,
}: {
  title: string;
  detail?: string;
  ctaLabel?: string;
  ctaHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-line">
      <div className="pointer-events-none select-none blur-[2px] opacity-50" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-ink/70 p-6 backdrop-blur-[2px]">
        <div className="max-w-sm rounded-[12px] border border-accent/40 bg-ink-elevated p-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
            Coming later
          </p>
          <h2 className="mt-2 text-xl font-bold text-paper">{title}</h2>
          <p className="mt-2 text-sm text-paper-muted">{detail}</p>
          <p className="mt-3 text-xs text-paper-muted">
            No checkout yet. The live board keeps humming for free.
          </p>
          <Link
            href={ctaHref}
            className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
