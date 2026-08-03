import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { SettingsPageClient } from "@/components/settings/SettingsPageClient";
import { siteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Tooltips, motion, density, and board defaults for Chain Dials. Stored on this device only.",
  alternates: { canonical: `${siteUrl()}/settings` },
  openGraph: {
    title: `Settings · ${SITE_NAME}`,
    description: "Tips, motion, density, and board defaults for Chain Dials.",
  },
};

export default function SettingsPage() {
  return (
    <AppShell suiteHome>
      <header className="mb-8 max-w-2xl">
        <p className="mb-2 text-xs uppercase tracking-[0.22em] text-accent">
          Preferences
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-paper md:text-5xl">
          Settings
        </h1>
        <p className="mt-3 text-base text-paper-muted md:text-lg">
          Turn tips on while you’re learning, or off once the board feels
          familiar. Everything here stays in this browser.
        </p>
      </header>
      <SettingsPageClient />
    </AppShell>
  );
}
