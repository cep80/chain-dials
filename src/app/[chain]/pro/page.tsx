"use client";

import { AppShell } from "@/components/shell/AppShell";
import { useChain } from "@/lib/chains/context";
import { SUITE } from "@/lib/chains/registry";
import { supportEmail } from "@/lib/site";
import Link from "next/link";

const FEATURES = [
  {
    title: "Alerts that nudge",
    body: "Fee spikes, a quiet tip, a full mempool, price bands. Email or a webhook, when we ship it.",
  },
  {
    title: "Wall / TV mode",
    body: "All five instruments, larger type, less chrome — built for a second monitor.",
  },
  {
    title: "Longer memory",
    body: "Week-to-month sparklines and CSV export, past the free ~24h you keep locally.",
  },
  {
    title: "Saved layouts",
    body: "Name a pinboard, share a URL. Your preferred layout, one click away.",
  },
];

export default function ProPage() {
  const chain = useChain();
  const email = supportEmail();
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Pro</p>
        <h1 className="mt-2 text-4xl font-extrabold text-paper md:text-5xl">
          More tools, same free board
        </h1>
        <p className="mt-4 text-lg text-paper-muted">
          {SUITE.name} keeps the live numbers free on every chain. Pro is for
          what sits around them: alerts, a full wall, longer history. We’re not
          taking payments yet — this is a waitlist.
        </p>

        <div
          id="waitlist"
          className="mt-10 rounded-[14px] border border-accent/40 bg-ink-elevated p-6 md:p-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-paper-muted">Thinking about</p>
              <p className="mono text-4xl font-medium text-paper">
                $6<span className="text-lg text-paper-muted">/mo</span>
              </p>
              <p className="mt-1 text-sm text-paper-muted">
                or ~50k sats · checkout comes later
              </p>
            </div>
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(`${SUITE.name} Pro waitlist (${chain.shortName})`)}`}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-paper"
            >
              Email me when it’s ready
            </a>
          </div>
          <p className="mt-4 text-xs text-paper-muted">
            That button opens your mail app. We don’t have accounts yet. Free
            boards across the suite stay available either way.
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
          <Link href={`/${chain.slug}`} className="text-accent hover:underline">
            ← Back to {chain.name}
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
