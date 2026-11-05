"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";

type LinkState =
  | { kind: "reading" }
  | { kind: "ready"; accessToken: string }
  | { kind: "invalid"; reason: string };

/**
 * Supabase's recovery link lands here with the token in the URL fragment,
 * which never reaches a server. Read it once, then strip it from the address
 * bar so it does not linger in history.
 */
function readRecoveryFragment(): LinkState {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const description = params.get("error_description");
  if (description) return { kind: "invalid", reason: description };
  const accessToken = params.get("access_token");
  if (accessToken && params.get("type") === "recovery") return { kind: "ready", accessToken };
  return { kind: "invalid", reason: "This page needs the link from your reset email." };
}

// The fragment is stripped right after it is read, so the first read is kept
// here; the server has no fragment and always reports "reading". Cleared after
// unmount so a later visit reads its own link, a tick late because Strict Mode
// unmounts and remounts at once, after the fragment has gone.
const READING: LinkState = { kind: "reading" };
let captured: LinkState | null = null;
let pendingClear: ReturnType<typeof setTimeout> | undefined;
const emptySubscribe = () => () => {};
const clientSnapshot = () => (captured ??= readRecoveryFragment());
const serverSnapshot = () => READING;

export function ResetPasswordForm() {
  const router = useRouter();
  const link = useSyncExternalStore(emptySubscribe, clientSnapshot, serverSnapshot);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clearTimeout(pendingClear);
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    return () => {
      pendingClear = setTimeout(() => {
        captured = null;
      }, 0);
    };
  }, []);

  if (link.kind === "reading") {
    return <p className="text-sm text-paper-muted">Checking your link…</p>;
  }

  if (link.kind === "invalid") {
    return (
      <div className="space-y-4 text-sm">
        <p className="text-down">{link.reason}</p>
        <Link href="/account/forgot" className="btn-cta inline-block rounded-full px-4 py-2.5">
          Request a new link
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("The two passwords don’t match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: link.accessToken, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not set the password. Try again.");
        setBusy(false);
        return;
      }
      router.push("/account/signin?reset=1");
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="text-paper-muted">New password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-line bg-ink px-3 py-2.5 text-paper outline-none focus:border-accent"
        />
      </label>
      <label className="block text-sm">
        <span className="text-paper-muted">Confirm new password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-line bg-ink px-3 py-2.5 text-paper outline-none focus:border-accent"
        />
      </label>
      {error ? <p className="text-sm text-down">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="btn-cta w-full rounded-full px-4 py-2.5 text-sm disabled:opacity-60"
      >
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
