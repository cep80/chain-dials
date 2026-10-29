import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AppShell suiteHome>
      <div className="mx-auto max-w-md">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Account</p>
        <h1 className="mt-2 text-3xl font-extrabold text-paper">Choose a new password</h1>
        <p className="mt-2 text-sm text-paper-muted">At least 8 characters.</p>
        <div className="mt-8 rounded-[14px] border border-line bg-ink-elevated p-6">
          <ResetPasswordForm />
        </div>
      </div>
    </AppShell>
  );
}
