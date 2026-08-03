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
    title: "Alerts that nudge",
    body: "Fee spikes, quiet tip, stuffed waiting room, price bands. Rules sync to your account; browser notifications fire locally.",
  },
  {
    title: "Wall / TV mode",
    body: "All five instruments, big type, less chrome. Free for everyone. Pro doesn’t lock the wall.",
  },
  {
    title: "Longer memory",
    body: "30D, 90D, 1Y, and ALL on the price chart, plus CSV export of the active range.",
  },
  {
    title: "Saved layouts",
    body: "Name a pinboard per chain and restore it later. Synced when you’re signed in with Pro.",
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
          Extra dials, same free board
        </h1>
        <p className="mt-4 text-lg text-paper-muted">
          {SUITE.name} keeps the live numbers free on every chain. Pro is for the
          stuff around them: alerts, longer history, saved layouts.
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
              Needs Stripe env keys in production (
              <code className="text-paper">STRIPE_SECRET_KEY</code>,{" "}
              <code className="text-paper">STRIPE_PRICE_ID</code>, webhook
              secret). Free boards stay available either way.{" "}
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => void update()}
              >
                Refresh entitlement
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
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
