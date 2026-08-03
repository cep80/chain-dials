import { AppShell } from "@/components/shell/AppShell";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <AppShell suiteHome>
      <div className="mx-auto max-w-md">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Account</p>
        <h1 className="mt-2 text-3xl font-extrabold text-paper">Create account</h1>
        <p className="mt-2 text-sm text-paper-muted">
          Email and password. No seed phrases, ever. Free boards stay free.
        </p>
        <div className="mt-8 rounded-[14px] border border-line bg-ink-elevated p-6">
          <SignUpForm />
        </div>
      </div>
    </AppShell>
  );
}
