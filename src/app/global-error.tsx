"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort fallback when the root layout itself throws. Replaces the whole
 * document, so it brings its own html/body and avoids every provider.
 */
export default function GlobalError({
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
    <html lang="en">
      <body>
        <main className="flex min-h-dvh items-center justify-center px-6">
          <section className="max-w-md text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-paper">
              Chain Dials hit an error
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-paper-muted">
              Reload to reconnect to the live feeds.
            </p>
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="mt-8 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
            >
              Try again
            </button>
            {error.digest ? (
              <p className="mt-8 font-mono text-[11px] text-paper-muted">
                Ref {error.digest}
              </p>
            ) : null}
          </section>
        </main>
      </body>
    </html>
  );
}
