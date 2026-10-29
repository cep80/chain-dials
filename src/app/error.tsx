"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level crash fallback. Deliberately does not render AppShell: the shell
 * starts live feeds, and if it is what threw, wrapping the fallback in it would
 * throw again.
 */
export default function RouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <section className="max-w-md text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-warn">
          Board stalled
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-paper">
          Something broke while drawing this page
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-paper-muted">
          Usually an upstream feed returned something unexpected. Retrying
          often clears it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-paper-muted transition hover:text-paper"
          >
            All boards
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-8 font-mono text-[11px] text-paper-muted">
            Ref {error.digest}
          </p>
        ) : null}
      </section>
    </main>
  );
}
