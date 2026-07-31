const PARTNER_URL =
  process.env.NEXT_PUBLIC_PARTNER_URL ?? "https://trezor.io/";
const PARTNER_NAME =
  process.env.NEXT_PUBLIC_PARTNER_NAME ?? "Trezor";
const PARTNER_BLURB =
  process.env.NEXT_PUBLIC_PARTNER_BLURB ??
  "Keys on a device you hold. For when “not your keys…” stops being a meme.";

export function PartnerSlot() {
  return (
    <aside
      className="rounded-[12px] border border-dashed border-line-strong bg-ink-soft/60 p-4"
      aria-label="Partner"
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-paper-muted">
        Partner · may earn a commission
      </p>
      <a
        href={PARTNER_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="mt-2 block"
      >
        <p className="text-lg font-bold text-paper">{PARTNER_NAME}</p>
        <p className="mt-1 text-sm leading-relaxed text-paper-muted">
          {PARTNER_BLURB}
        </p>
        <span className="mt-3 inline-block text-xs font-semibold text-accent">
          Take a look →
        </span>
      </a>
    </aside>
  );
}
