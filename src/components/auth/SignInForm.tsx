"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useMemo, useState } from "react";
import { safeCallbackUrl } from "@/lib/safe-url";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = useMemo(
    () => safeCallbackUrl(params.get("callbackUrl"), "/account"),
    [params],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setBusy(false);
    if (res?.error) {
      setError("Email or password didn’t match.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

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
      <label className="block text-sm">
        <span className="text-paper-muted">Password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-line bg-ink px-3 py-2.5 text-paper outline-none focus:border-accent"
        />
      </label>
      {error ? <p className="text-sm text-down">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-paper-muted">
        New here?{" "}
        <Link href="/account/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
