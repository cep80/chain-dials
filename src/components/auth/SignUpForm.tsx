"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create account");
        setBusy(false);
        return;
      }
      const signed = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/account",
      });
      if (signed?.error) {
        setError("Account created, but sign-in failed. Try signing in.");
        setBusy(false);
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="text-paper-muted">Name (optional)</span>
        <input
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-line bg-ink px-3 py-2.5 text-paper outline-none focus:border-accent"
        />
      </label>
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
        <span className="text-paper-muted">Password (8+ characters)</span>
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
      {error ? <p className="text-sm text-down">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create account"}
      </button>
      <p className="text-center text-sm text-paper-muted">
        Already have one?{" "}
        <Link href="/account/signin" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
