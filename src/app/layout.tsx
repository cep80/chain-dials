import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Syne } from "next/font/google";
import { NativeAppProvider } from "@/components/native/NativeAppProvider";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import { siteUrl, SITE_NAME } from "@/lib/site";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: "Chain Dials: Bitcoin, Ethereum, Solana, Hyperliquid",
    template: "%s · Chain Dials",
  },
  description:
    "Live network dials for Bitcoin, Ethereum, Solana, and Hyperliquid — each board with its own instruments.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chain Dials",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Chain Dials: Bitcoin, Ethereum, Solana, Hyperliquid",
    description:
      "Live network dials for Bitcoin, Ethereum, Solana, and Hyperliquid. Pick a board.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chain Dials",
    description:
      "Live network dials for Bitcoin, Ethereum, Solana, and Hyperliquid.",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0c10" },
    { media: "(prefers-color-scheme: light)", color: "#0a0c10" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${plexMono.variable} h-full`}>
      <body className="relative min-h-full">
        <NativeAppProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </NativeAppProvider>
      </body>
    </html>
  );
}
