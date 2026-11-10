"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { sessionFetch } from "@/lib/session-fetch";

/** In-app account deletion, which both app stores require. */
export function DeleteAccount({ pro }: { pro: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await sessionFetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not delete the account.");
        setBusy(false);
        return;
      }
    } catch {
      setError("Network error. Check your connection and try again.");
      setBusy(false);
      return;
    }
    // The account is gone from here on, so stay busy: there is nothing to retry.
    try {
      await signOut({ callbackUrl: "/account?deleted=1" });
    } catch {
      setError("Your account is deleted, but this device is still signed in. Use Sign out to finish.");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-paper-muted underline-offset-2 hover:text-down hover:underline"
      >
        Delete account
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="rounded-[14px] border border-down/50 bg-down/5 p-5"
      aria-labelledby="delete-account-title"
    >
      <h2 id="delete-account-title" className="text-lg font-bold text-paper">
        Delete your account
      </h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-paper-muted">
        <li>Your sign-in, saved layouts, alert rules, wall packs and desks are deleted.</li>
        {pro ? (
          <li>Pro ends immediately. The current billing period is not refunded.</li>
        ) : null}
        <li>Settings and watchlists kept on this device are not affected.</li>
        <li>This cannot be undone.</li>
      </ul>
      <label className="mt-4 block text-sm text-paper" htmlFor="delete-password">
        Password
      </label>
      <input
        id="delete-password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1 w-full rounded-[10px] border border-line bg-ink px-3 py-2 text-paper"
      />
      {error ? (
        <p className="mt-3 text-sm text-down" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy || !password}
          className="rounded-full border border-down bg-down/15 px-4 py-2 text-sm font-semibold text-paper disabled:opacity-60"
        >
          {busy ? "Deleting…" : "Delete account permanently"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setPassword("");
            setError(null);
          }}
          className="rounded-full border border-line px-4 py-2 text-sm text-paper-muted hover:text-paper"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
