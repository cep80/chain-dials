import { AppShell } from "@/components/shell/AppShell";
import Link from "next/link";

const FEATURES = [
  {
    title: "Smart alerts",
    body: "Fee spikes, mempool backlog, stagnant tips, and price bands — email or webhook.",
  },
  {
    title: "Wall / kiosk mode",
    body: "Full five-instrument grid, large type, chrome-free — built for a second monitor or office TV.",
  },
  {
    title: "Longer history",
    body: "7–30 day sparklines and CSV export beyond the free local 24h buffer.",
  },
  {
    title: "Named layouts",
    body: "Save and share favorite pinboards with a URL.",
  },
];

export default function ProPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Pricing</p>
        <h1 className="mt-2 text-4xl font-extrabold text-paper md:text-5xl">
          Pro for power users
        </h1>
        <p className="mt-4 text-lg text-paper-muted">
          The live fundamentals board stays free forever. Pro adds muscle around
          it — not a lock on the numbers. Checkout isn’t wired yet.
        </p>

        <div
          id="waitlist"
          className="mt-10 rounded-[14px] border border-accent/40 bg-ink-elevated p-6 md:p-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-paper-muted">Planned starting at</p>
              <p className="mono text-4xl font-medium text-paper">
                $6<span className="text-lg text-paper-muted">/mo</span>
              </p>
              <p className="mt-1 text-sm text-paper-muted">
                or ~50k sats / month · payments coming in a later phase
              </p>
            </div>
            <a
              href="mailto:hello@example.com?subject=BTC%20Dash%20Pro%20waitlist"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-paper"
            >
              Join waitlist
            </a>
          </div>
          <p className="mt-4 text-xs text-paper-muted">
            Email opens your mail client — no account system yet. Free Observatory,
            cadence wall, and Atmosphere inspect stay live either way.
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className="rounded-[12px] border border-line bg-ink-elevated/70 p-4"
            >
              <h2 className="font-bold text-paper">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-paper-muted">
                {f.body}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-paper-muted">
          <Link href="/" className="text-accent hover:underline">
            ← Back to the free board
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
