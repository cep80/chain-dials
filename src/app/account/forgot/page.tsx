import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AppShell suiteHome>
      <div className="mx-auto max-w-md">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Account</p>
        <h1 className="mt-2 text-3xl font-extrabold text-paper">Reset your password</h1>
        <p className="mt-2 text-sm text-paper-muted">
          Enter your account email and we’ll send a link to choose a new password.
        </p>
        <div className="mt-8 rounded-[14px] border border-line bg-ink-elevated p-6">
          <ForgotPasswordForm />
        </div>
      </div>
    </AppShell>
  );
}
