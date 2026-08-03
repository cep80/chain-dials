import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { SITE_NAME, supportEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms for using ${SITE_NAME} on web, iOS, and Android.`,
};

export default function TermsPage() {
  const email = supportEmail();
  return (
    <LegalDoc title="Terms of Use">
      <p>
        By using {SITE_NAME} (the website or the iOS / Android apps), you agree
        to these terms. If you do not agree, do not use the product.
      </p>

      <h2>What this is</h2>
      <p>
        {SITE_NAME} shows live visual dials for Bitcoin,
        Ethereum, Solana, and Hyperliquid public metrics. It is not a wallet, exchange,
        broker, or investment adviser. Nothing in the product is financial,
        legal, or tax advice.
      </p>

      <h2>No trading execution</h2>
      <p>
        Readings can be delayed, incomplete, or wrong. Do not rely on them as
        the sole basis for buying, selling, or transferring assets. You are
        responsible for verifying critical data on primary sources.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not abuse, overload, or disrupt our servers or upstream APIs.</li>
        <li>Do not attempt to reverse engineer store binaries for malware.</li>
        <li>Do not use the product to violate law or third-party rights.</li>
      </ul>

      <h2>Intellectual property</h2>
      <p>
        The {SITE_NAME} name, visual design, and original code are ours (or our
        licensors). Public chain data remains subject to its own sources. You
        may share screenshots and share links for personal, non-misleading use.
      </p>

      <h2>Third-party services</h2>
      <p>
        Live feeds depend on public infrastructure and providers outside our
        control. Outages, rate limits, or data errors there can affect the
        boards. Links to partners or tip destinations are optional and governed
        by those parties.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        The product is provided &quot;as is&quot; and &quot;as available&quot;
        without warranties of any kind, express or implied, including
        merchantability, fitness for a particular purpose, and
        non-infringement.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, we are not liable for any
        indirect, incidental, special, consequential, or punitive damages, or
        for lost profits, data, or digital assets, arising from your use of{" "}
        {SITE_NAME}.
      </p>

      <h2>App Store / Play Store</h2>
      <p>
        If you downloaded a native build from Apple or Google, their standard
        licensed application terms also apply. In a conflict about store
        refunds or billing, the platform&apos;s rules control that part.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The effective date at the top will change
        when we do. Continued use after an update means you accept the revised
        terms.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${email}`}>{email}</a>
      </p>
    </LegalDoc>
  );
}
