"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/shell/AppShell";
import { useChain } from "@/lib/chains/context";
import { SUITE } from "@/lib/chains/registry";
import { PRO_PRICE_LABEL } from "@/lib/pro";
import { useProAccess } from "@/hooks/useProAccess";

const FEATURES = [
  {
    title: "What stays free",
    body: "Live boards on every chain, single-chain wall / TV mode, full price history, CSV, instruments, Trace, and share. No ticket into the room.",
  },
  {
    title: "Control room wall packs",
    body: "Multi-chain rotation for a TV: pack BTC/ETH/SOL/HYPE walls or dials, kiosk timing, sync packs to your account.",
    href: "/control-room",
  },
  {
    title: "Instrument-state alerts",
    body: "Nudge when the metronome runs late, atmosphere pressure spikes, or forge heat clears your floor — plus classic fee/tip rules.",
    href: "alerts",
  },
  {
    title: "Forensics desk packs",
    body: "Pin txs and addresses, export markdown. Local desks free; Pro syncs desks across devices.",
    href: "/btc/desk",
  },
  {
    title: "Named layouts",
    body: "Save a favorites layout per chain and restore it later when you hop machines.",
  },
];

export default function ProPage() {
  const chain = useChain();
  const { pro, signedIn } = useProAccess();
  const { update } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    if (!signedIn) {
      window.location.href = `/account/signin?callbackUrl=/${chain.slug}/pro`;
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain: chain.slug }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setError(body.error ?? "Checkout unavailable");
        setBusy(false);
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("Network error");
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Pro</p>
        <h1 className="mt-2 text-4xl font-extrabold text-paper md:text-5xl">
          Remote, schedule, and memory
        </h1>
        <p className="mt-4 text-lg text-paper-muted">
          {SUITE.name} keeps the show free. Pro is the control room, instrument
          alerts, and desk memory — optional extras on top of free boards.
        </p>

        <div
          id="checkout"
          className="mt-10 rounded-[14px] border border-accent/40 bg-ink-elevated p-6 md:p-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-paper-muted">
                {pro ? "You’re on Pro" : "Pro"}
              </p>
              <p className="mono text-4xl font-medium text-paper">
                {PRO_PRICE_LABEL.replace("/mo", "")}
                <span className="text-lg text-paper-muted">/mo</span>
              </p>
              <p className="mt-1 text-sm text-paper-muted">
                Cancel anytime in the Stripe customer portal.
              </p>
            </div>
            {pro ? (
              <Link
                href="/account"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink"
              >
                Manage account
              </Link>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void startCheckout()}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
              >
                {busy
                  ? "Starting checkout…"
                  : signedIn
                    ? "Subscribe with Stripe"
                    : "Sign in to subscribe"}
              </button>
            )}
          </div>
          {error ? <p className="mt-3 text-sm text-down">{error}</p> : null}
          {!pro ? (
            <p className="mt-4 text-xs text-paper-muted">
              Just subscribed?{" "}
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => void update()}
              >
                Refresh Pro status
              </button>
            </p>
          ) : null}
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
              {"href" in f && f.href ? (
                <Link
                  href={
                    f.href.startsWith("/")
                      ? f.href
                      : `/${chain.slug}/${f.href}`
                  }
                  className="mt-3 inline-block text-xs font-semibold text-accent hover:underline"
                >
                  Open →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
