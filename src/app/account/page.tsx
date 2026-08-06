"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { PRO_PRICE_LABEL } from "@/lib/pro";

function AccountBody() {
  const { data, status, update } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const checkout = params.get("checkout");
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status === "loading") {
    return <p className="text-paper-muted">Loading account…</p>;
  }

  if (status !== "authenticated" || !data?.user) {
    return (
      <div className="rounded-[14px] border border-line bg-ink-elevated p-6">
        <p className="text-paper">You’re signed out.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/account/signin"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/account/signup"
            className="rounded-full border border-line px-4 py-2 text-sm text-paper"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const user = data.user;

  const startCheckout = async () => {
    setBusy("checkout");
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain: "btc" }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setError(body.error ?? "Checkout unavailable");
        setBusy(null);
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("Network error starting checkout");
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setBusy("portal");
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setError(body.error ?? "Billing portal unavailable");
        setBusy(null);
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("Network error opening portal");
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {checkout === "success" ? (
        <div className="rounded-[12px] border border-up/40 bg-up/10 px-4 py-3 text-sm text-paper">
          Checkout complete. If Pro isn’t showing yet, give Stripe a moment, then{" "}
          <button
            type="button"
            className="text-accent underline"
            onClick={() => void update()}
          >
            refresh Pro status
          </button>
          .
        </div>
      ) : null}

      <div className="rounded-[14px] border border-line bg-ink-elevated p-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-paper-muted">
          Signed in
        </p>
        <h2 className="mt-1 text-xl font-bold text-paper">
          {user.name || user.email}
        </h2>
        <p className="mono mt-1 text-sm text-paper-muted">{user.email}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span
            className={
              user.pro
                ? "rounded-full bg-accent/15 px-3 py-1 font-semibold text-accent"
                : "rounded-full border border-line px-3 py-1 text-paper-muted"
            }
          >
            {user.pro ? "Pro active" : `Free · Pro is ${PRO_PRICE_LABEL}`}
          </span>
          <span className="text-xs text-paper-muted">
            Status: {user.proStatus}
            {user.proCurrentPeriodEnd
              ? ` · period ends ${new Date(user.proCurrentPeriodEnd).toLocaleDateString()}`
              : ""}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {user.pro ? (
            <button
              type="button"
              disabled={busy === "portal"}
              onClick={() => void openPortal()}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
            >
              {busy === "portal" ? "Opening…" : "Manage billing"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy === "checkout"}
              onClick={() => void startCheckout()}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
            >
              {busy === "checkout" ? "Starting…" : `Upgrade to Pro (${PRO_PRICE_LABEL})`}
            </button>
          )}
          <Link
            href="/btc/alerts"
            className="rounded-full border border-line px-4 py-2 text-sm text-paper hover:border-accent"
          >
            Alerts
          </Link>
          <button
            type="button"
            onClick={() => {
              void signOut({ callbackUrl: "/" });
            }}
            className="rounded-full border border-line px-4 py-2 text-sm text-paper-muted hover:text-paper"
          >
            Sign out
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-down">{error}</p> : null}
      </div>

      <div className="rounded-[14px] border border-dashed border-line p-5 text-sm text-paper-muted">
        <p className="font-semibold text-paper">What Pro is (and isn’t)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Pro: control-room wall packs, instrument-state alerts, desk sync,
            named layouts
          </li>
          <li>
            Free: live boards, single-chain wall, full history, CSV, Trace,
            local desks + export
          </li>
          <li>Stay free anytime. The dials don’t require a subscription.</li>
        </ul>
        <button
          type="button"
          className="mt-3 text-accent hover:underline"
          onClick={() => router.push("/btc/pro")}
        >
          See the Pro page
        </button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <AppShell suiteHome>
      <div className="mx-auto max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Account</p>
        <h1 className="mt-2 text-3xl font-extrabold text-paper md:text-4xl">
          Your Chain Dials account
        </h1>
        <p className="mt-2 text-paper-muted">
          Sign-in and optional Pro billing for synced alerts and layouts. Live
          boards never require an account or payment.
        </p>
        <div className="mt-8">
          <Suspense fallback={<p className="text-paper-muted">Loading…</p>}>
            <AccountBody />
          </Suspense>
        </div>
      </div>
    </AppShell>
  );
}
