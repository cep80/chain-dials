"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/shell/AppShell";
import { useChain } from "@/lib/chains/context";
import { PRO_ANNUAL_PRICE_LABEL, PRO_PRICE_LABEL } from "@/lib/pro";
import { PRO_WATCH_LIMIT } from "@/lib/entitlement";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import { useProAccess } from "@/hooks/useProAccess";
import { sessionFetch } from "@/lib/session-fetch";
import type { StorePlan } from "@/lib/store-purchase";

const FEATURES = [
  {
    title: "Transaction tracking",
    body: "Paste a txid and get a push or Telegram message when it confirms, when it's settled at 3 confirmations, or if it's stuck and needs a fee bump.",
    href: "/btc/watch?kind=tx",
  },
  {
    title: "Wallet watch",
    body: "Hear the moment an address you care about receives or spends, from the mempool, not the next time you open the app.",
    href: "/btc/watch?kind=address",
  },
  {
    title: "Solo miner companion",
    body: "Point it at your Bitaxe's payout address. If you hit a block, you'll know first. Plus a daily read on your odds.",
    href: "/btc/watch?kind=solo",
  },
  {
    title: "Control room and sync",
    body: "Multi-chain wall packs for a TV, and your forensics desks and layouts synced across devices.",
    href: "/control-room",
  },
];

const FREE =
  "Every live board, single-chain wall and TV mode, full price history and CSV, solo odds, Trace, wallet lookup, saved layouts on your device, and one watch.";

function NativeCheckout({ chainSlug }: { chainSlug: string }) {
  const { pro, signedIn, user } = useProAccess();
  const { update } = useSession();
  const [plans, setPlans] = useState<StorePlan[] | null>(null);
  const [storeReady, setStoreReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!signedIn || pro || !userId) return;
    let cancelled = false;
    void (async () => {
      const store = await import("@/lib/store-purchase");
      if (!store.storePurchasesAvailable()) {
        if (!cancelled) setStoreReady(false);
        return;
      }
      try {
        const list = await store.loadStorePlans(userId);
        if (!cancelled) {
          setPlans(list);
          setStoreReady(true);
        }
      } catch {
        if (!cancelled) {
          setStoreReady(true);
          setMessage("Couldn't reach the store. Check your connection and try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, pro, userId]);

  const buy = async (planId: string) => {
    if (!userId) return;
    setBusy(planId);
    setMessage(null);
    try {
      const { buyStorePlan } = await import("@/lib/store-purchase");
      const result = await buyStorePlan(userId, planId);
      if (result === "pro") {
        await update();
        setMessage("Welcome to Pro.");
      } else if (result === "pending") {
        setMessage("Purchase received. Pro unlocks as soon as the store confirms it.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "The purchase didn't go through.");
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    if (!userId) return;
    setBusy("restore");
    setMessage(null);
    try {
      const { restoreStorePurchases } = await import("@/lib/store-purchase");
      const ok = await restoreStorePurchases(userId);
      await update();
      setMessage(ok ? "Pro restored." : "No active Pro purchase found for this store account.");
    } catch {
      setMessage("Couldn't restore purchases. Try again.");
    } finally {
      setBusy(null);
    }
  };

  if (pro) {
    return <p className="mt-2 text-paper">Pro is active on this account.</p>;
  }
  if (!signedIn) {
    return (
      <div className="mt-2">
        <p className="text-paper">Sign in first, so Pro follows your account to every device.</p>
        <Link
          href={`/account/signin?callbackUrl=/${chainSlug}/pro`}
          className="btn-cta mt-4 inline-block rounded-full px-5 py-2.5 text-sm"
        >
          Sign in
        </Link>
      </div>
    );
  }
  if (storeReady === false) {
    return (
      <div className="mt-2">
        <p className="text-paper">
          Pro isn&apos;t sold in this version of the app. If you already have Pro on this account, it unlocks here
          automatically.
        </p>
        <button
          type="button"
          className="mt-4 rounded-full border border-line px-4 py-2 text-sm text-paper"
          onClick={() => void update()}
        >
          Refresh Pro status
        </button>
      </div>
    );
  }
  return (
    <div className="mt-2">
      {plans == null && !message ? <p className="text-paper-muted">Loading plans…</p> : null}
      <div className="flex flex-wrap gap-3">
        {(plans ?? []).map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busy != null}
            onClick={() => void buy(p.id)}
            className="btn-cta rounded-full px-5 py-2.5 text-sm disabled:opacity-60"
          >
            {busy === p.id
              ? "Opening…"
              : `${p.price} / ${p.period === "year" ? "year" : p.period === "month" ? "month" : p.title}`}
          </button>
        ))}
        <button
          type="button"
          disabled={busy != null}
          onClick={() => void restore()}
          className="rounded-full border border-line px-4 py-2 text-sm text-paper disabled:opacity-60"
        >
          {busy === "restore" ? "Restoring…" : "Restore purchases"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-paper-muted" role="status">{message}</p> : null}
      <p className="mt-4 text-xs leading-relaxed text-paper-muted">
        Subscriptions renew automatically until cancelled in your App Store or Google Play settings, at least 24
        hours before the period ends. See the <Link href="/terms" className="underline">Terms</Link> and{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}

function WebCheckout({ chainSlug }: { chainSlug: string }) {
  const { pro, signedIn } = useProAccess();
  const { update } = useSession();
  const router = useRouter();
  const [interval, setBillingInterval] = useState<"month" | "year">("year");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    if (!signedIn) {
      router.push(`/account/signin?callbackUrl=/${chainSlug}/pro`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await sessionFetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain: chainSlug, interval }),
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

  if (pro) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-paper">You&apos;re on Pro.</p>
        <Link href="/account" className="btn-cta rounded-full px-5 py-2.5 text-sm">
          Manage account
        </Link>
      </div>
    );
  }

  const label = interval === "year" ? PRO_ANNUAL_PRICE_LABEL : PRO_PRICE_LABEL;
  const [amount, per] = label.split("/");
  return (
    <>
      <div className="flex gap-2" role="radiogroup" aria-label="Billing period">
        {(["year", "month"] as const).map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={interval === i}
            onClick={() => setBillingInterval(i)}
            className={`min-h-11 rounded-full border px-4 text-sm ${interval === i ? "border-accent text-paper" : "border-line text-paper-muted"}`}
          >
            {i === "year" ? "Yearly · 2 months free" : "Monthly"}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-4xl font-medium text-paper">
            {amount}
            <span className="text-lg text-paper-muted">/{per}</span>
          </p>
          <p className="mt-1 text-sm text-paper-muted">Cancel anytime in the Stripe customer portal.</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void startCheckout()}
          className="btn-cta rounded-full px-5 py-2.5 text-sm disabled:opacity-60"
        >
          {busy ? "Starting checkout…" : signedIn ? "Subscribe with Stripe" : "Sign in to subscribe"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-down">{error}</p> : null}
      <p className="mt-4 text-xs text-paper-muted">
        Just subscribed?{" "}
        <button type="button" className="text-accent hover:underline" onClick={() => void update()}>
          Refresh Pro status
        </button>
      </p>
    </>
  );
}

export default function ProPage() {
  const chain = useChain();
  const native = useIsNativeApp();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Pro</p>
        <h1 className="mt-2 text-4xl font-extrabold text-paper md:text-5xl">
          We watch your coins so you don&apos;t have to
        </h1>
        <p className="mt-4 text-lg text-paper-muted">
          The dials are free. Pro keeps an eye on your own transactions, wallets and miner around the clock, up to{" "}
          {PRO_WATCH_LIMIT} at once, and tells you on your phone or in Telegram the moment something happens.
        </p>

        <div id="checkout" className="mt-10 rounded-[14px] border border-accent/40 bg-ink-elevated p-6 md:p-8">
          <p className="mb-3 text-sm text-paper-muted">Pro</p>
          {native ? <NativeCheckout chainSlug={chain.slug} /> : <WebCheckout chainSlug={chain.slug} />}
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-[12px] border border-line bg-ink-elevated/70 p-4">
              <h2 className="font-bold text-paper">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-paper-muted">{f.body}</p>
              <Link href={f.href} className="mt-3 inline-block text-xs font-semibold text-accent hover:underline">
                Open →
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-[12px] border border-dashed border-line p-4 text-sm text-paper-muted">
          <p className="font-semibold text-paper">Free, always</p>
          <p className="mt-1">{FREE}</p>
        </div>
      </div>
    </AppShell>
  );
}
