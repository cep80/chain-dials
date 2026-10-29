"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not send the link. Try again shortly.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4 text-sm">
        <p className="text-paper">
          If {email} has an account, a reset link is on its way. It works once
          and expires in an hour.
        </p>
        <p className="text-paper-muted">
          Nothing after a few minutes? Check spam, or{" "}
          <button type="button" className="text-accent hover:underline" onClick={() => setSent(false)}>
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="text-paper-muted">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-line bg-ink px-3 py-2.5 text-paper outline-none focus:border-accent"
        />
      </label>
      {error ? <p className="text-sm text-down">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="btn-cta w-full rounded-full px-4 py-2.5 text-sm disabled:opacity-60"
      >
        {busy ? "Sending…" : "Email me a reset link"}
      </button>
      <p className="text-center text-sm text-paper-muted">
        Remembered it?{" "}
        <Link href="/account/signin" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
