import { Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <AppShell suiteHome>
      <div className="mx-auto max-w-md">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Account</p>
        <h1 className="mt-2 text-3xl font-extrabold text-paper">Sign in</h1>
        <p className="mt-2 text-sm text-paper-muted">
          Boards stay free. An account unlocks Pro checkout, saved layouts, and
          synced alert rules.
        </p>
        <div className="mt-8 rounded-[14px] border border-line bg-ink-elevated p-6">
          <Suspense fallback={<p className="text-sm text-paper-muted">Loading…</p>}>
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </AppShell>
  );
}
