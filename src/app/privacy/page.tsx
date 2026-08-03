import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { SITE_NAME, supportEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} handles data on web, iOS, and Android.`,
};

export default function PrivacyPage() {
  const email = supportEmail();
  return (
    <LegalDoc title="Privacy Policy">
      <p>
        {SITE_NAME} (&quot;we&quot;, &quot;the app&quot;) shows live Bitcoin,
        Ethereum, Solana, and Hyperliquid network instruments. This policy explains what we
        collect, what we do not, and how store builds differ from the website.
      </p>

      <h2>Summary</h2>
      <ul>
        <li>No account is required to use the boards.</li>
        <li>
          Optional accounts (email/password) power Pro checkout, saved layouts,
          and synced alert rules. Billing is handled by Stripe.
        </li>
        <li>We do not sell personal information.</li>
        <li>
          Favorites and small UI preferences stay on your device
          (browser storage or the native WebView).
        </li>
        <li>
          The app loads public network and market data through our servers and
          public endpoints. That traffic is about chains, not about you as a
          person.
        </li>
        <li>We do not run third-party advertising SDKs in the native apps.</li>
      </ul>

      <h2>Data stored on your device</h2>
      <p>Depending on features you use, the app may keep locally:</p>
      <ul>
        <li>Favorite instruments per chain</li>
        <li>Settings (tooltips, motion, density, preferred chain, chart range)</li>
        <li>Short history used by instruments (for example fee atmosphere)</li>
        <li>
          Optional return-nudge preference (`chain-dials:local-nudge:*`), only
          if you opt in; stays on-device
        </li>
        <li>Simple dismiss flags for optional tips</li>
      </ul>
      <p>
        Clearing site data (web) or uninstalling the app (native) removes this
        local state. We cannot recover it from our servers because we do not
        host it.
      </p>

      <h2>Network requests</h2>
      <p>
        When you open a board, your device requests live readings (blocks,
        fees, mempool pressure, and related public metrics). Requests go to our
        API routes and to public data providers we proxy or call. Standard
        server logs (IP address, user agent, timestamps, paths) may be retained
        by our host for security and reliability, then rotated per their
        retention practice.
      </p>

      <h2>Sharing</h2>
      <p>
        Share opens your system share sheet, X, or Nostr tools you already use.
        If you publish with a Nostr extension or signer, that publish is under
        your keys and that network&apos;s norms. We do not receive your Nostr
        private key.
      </p>

      <h2>Payments</h2>
      <p>
        Optional Lightning tips use an address or LNURL you see in the product.
        Pro subscriptions are billed by Stripe under their terms. We store Stripe
        customer and subscription IDs on your account record so we can unlock
        Pro features. We do not store full card numbers.
      </p>

      <h2>Children</h2>
      <p>
        {SITE_NAME} is not directed at children under 13. We do not knowingly
        collect personal information from children.
      </p>

      <h2>Native apps (iOS / Android)</h2>
      <p>
        Store builds are Capacitor shells that load {SITE_NAME} over HTTPS. The
        same privacy rules apply. Status bar, splash, haptics, and system share
        use platform APIs and do not send content to us beyond normal OS
        behavior.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Stop using the app or site at any time.</li>
        <li>Clear local storage / uninstall to wipe device preferences.</li>
        <li>
          Contact us at{" "}
          <a href={`mailto:${email}`}>{email}</a> for privacy questions.
        </li>
      </ul>

      <h2>Changes</h2>
      <p>
        We may update this policy. The effective date at the top will change
        when we do. Continued use after an update means you accept the revised
        policy.
      </p>
    </LegalDoc>
  );
}
