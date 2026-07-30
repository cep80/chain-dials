import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { LEGAL, SITE_NAME, supportEmail } from "@/lib/site";

export function LegalDoc({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const email = supportEmail();
  return (
    <AppShell suiteHome>
      <article className="mx-auto max-w-2xl">
        <p className="mb-2 text-xs uppercase tracking-[0.22em] text-accent">
          {SITE_NAME}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-paper md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-paper-muted">
          Effective {LEGAL.effectiveDate}
        </p>
        <div className="prose-legal mt-10 space-y-6 text-sm leading-relaxed text-paper-muted [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-paper [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
        <p className="mt-12 border-t border-line pt-6 text-xs text-paper-muted">
          Questions:{" "}
          <a href={`mailto:${email}`} className="text-accent hover:underline">
            {email}
          </a>
          {" · "}
          <Link href={LEGAL.privacyPath} className="hover:text-paper">
            Privacy
          </Link>
          {" · "}
          <Link href={LEGAL.termsPath} className="hover:text-paper">
            Terms
          </Link>
        </p>
      </article>
    </AppShell>
  );
}
