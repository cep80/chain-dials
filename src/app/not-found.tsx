import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <AppShell suiteHome>
      <section className="mx-auto max-w-xl py-16 text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-accent">
          404
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-paper md:text-4xl">
          No dial at this address
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-paper-muted">
          The link may be old or mistyped. Pick a board to get back to live
          readings.
        </p>
        <nav className="mt-10 flex flex-wrap justify-center gap-3">
          {CHAIN_ORDER.map((id) => (
            <Link
              key={id}
              href={`/${CHAINS[id].slug}`}
              className="rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
            >
              {CHAINS[id].name}
            </Link>
          ))}
        </nav>
        <p className="mt-8 text-xs text-paper-muted">
          <Link href="/" className="hover:text-paper">
            All boards
          </Link>
        </p>
      </section>
    </AppShell>
  );
}
