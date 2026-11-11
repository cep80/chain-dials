# Chain Dials · iOS & Android

Native shells are **Capacitor** WebViews pointed at the live Next.js app (so `/api/*` and mempool sockets keep working). The same codebase is also a **PWA** (Add to Home Screen).

## Prerequisites

- Node 20+
- **iOS:** macOS, Xcode 15+, CocoaPods (`cd ios/App && pod install`)
- **Android:** Android Studio, JDK 17, Android SDK 35

> On Windows you can build **Android** and the **PWA**. iOS archives require a Mac (or CI like MacStadium / GitHub macOS runners).

## One-time setup

```bash
npm install
npx cap add ios      # skip on Windows if you lack a Mac
npx cap add android
npm run cap:assets
npx cap sync
```

Set production origin in `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=https://chaindials.com
CAP_SERVER_URL=https://chaindials.com
```

## Develop against local Next

Terminal 1:

```bash
npm run dev
```

### iOS Simulator

```bash
npm run ios:dev
# or
CAP_DEV_URL=http://localhost:3000 npx cap sync ios
npm run ios
```

### Android Emulator

```bash
npm run android:dev
# or (PowerShell)
$env:CAP_DEV_URL="http://10.0.2.2:3000"; npx cap sync android; npm run android
```

### Physical device

Use your LAN IP so the phone can reach the Next server:

```bash
# PowerShell
$env:CAP_DEV_URL="http://192.168.1.20:3000"; npx cap sync; npm run android
```

Cleartext HTTP is allowed for local networking (Android `usesCleartextTraffic`, iOS `NSAllowsLocalNetworking`).

## Ship Store builds

See **[LAUNCH.md](./LAUNCH.md)** for the full checklist (signing, listing copy, Data Safety, App Privacy).

Quick path:

1. Deploy Next to production (`chaindials.com`).
2. Confirm `/privacy` and `/terms` are live.
3. `npm run cap:prod`
4. Open Xcode / Android Studio → signing → bump build number → Archive / Bundle.

| Store | Bundle / package |
|-------|------------------|
| App Store | `com.chaindials.app` |
| Play Store | `com.chaindials.app` |

## What is native

| Feature | Behavior |
|--------|----------|
| Status bar | Dark ink `#0a0c10` |
| Splash | Ink splash from `assets/` |
| Share | System sheet via `@capacitor/share` + light haptic |
| Back (Android) | Closes instrument stage, then history, then exit |
| Resume | Refreshes relative clocks |
| Safe areas | Notch / home indicator via sticky header + footer |
| Keyboard | Body resize |

## Home-screen widgets

Both widgets read one public endpoint, `GET /api/widget` (`src/lib/widget.ts`): BTC price, 24h change and sparkline, latest block, fees, and halving progress. The CDN caches it for 60s. Each section is nullable, so if one upstream is down only that line goes blank. Both widgets keep the last good reading and mark it `offline` when a fetch fails.

| | iOS (`ios/App/ChainDialsWidget`) | Android (`android/.../widget`) |
|---|---|---|
| Sizes | Small, Medium, Lock Screen (rectangular, circular halving gauge, inline) | Resizable 2x2 to 4x2. At 230dp or wider it adds fees and halving |
| Refresh | Asks for every 15 min (iOS budgets the actual rate) | Every 30 min (Android's minimum), on resize, and when you tap the block line |
| Block clock | `Text(.relative)` ticks live | `Chronometer` ticks live |
| Tap | Opens `chaindials://btc` | Opens `https://chaindials.com/btc` |

### Dial widgets

Four of the board's instruments also ship as widgets: **Block Metronome**, **Block Sigil**, **Hashrate Forge** and **Issuance Hourglass**. They are native redraws of the SVG dials in the same 240-unit coordinates, so a coordinate change in `src/components/viz/*.tsx` should be copied to `ios/App/ChainDialsWidget/DialArt.swift` and `android/.../widget/*Art.java`. The Sigil glyph is a line-for-line port of `buildSigil()`, so keep the three in step.

| | iOS | Android |
|---|---|---|
| Sizes | Dials: Small. Hourglass: Medium, with its readings as text beside the glass | Dials: resizable square. Hourglass: 3x2 on a dark plate |
| Metronome hand | 30 timeline entries a minute apart per reload | Redrawn about once a minute by a non-waking alarm (screen on only) |
| Readings | Metronome uses `Text(.timer)` | Metronome uses `Chronometer` |
| Fetching | All widgets share the cached reading and refetch at most every 3–10 min | Same, every 3 min at most |

**iOS setup (once, on a Mac):** open the project in Xcode. Select the **ChainDialsWidget** target, then under Signing & Capabilities pick the same team as **App**. The widget needs iOS 16+, while the app still supports iOS 15. To test against a dev server, set the `CD_WIDGET_API_BASE` build setting on the widget target to e.g. `http://localhost:3000`.

**Android against a local server:**

```bash
cd android && ./gradlew installDebug -PwidgetApiBase=http://10.0.2.2:3000
```

Capacitor 8 needs JDK 21 or newer to build Android. Android Studio's bundled `jbr` works.

The endpoint has to be deployed to production before store builds ship. Until then the widgets show "Waiting for the chain".

## PWA (no store)

Open the site in Safari / Chrome → **Add to Home Screen**. Manifest + icons live under `public/`.

## Icons & splash

Source art:

- `assets/icon.png` (1024+)
- `assets/splash.png`
- `assets/icon-only.png` (optional)

Regenerate:

```bash
npm run cap:assets
npx cap sync
```

PWA icons in `public/icons/` are maintained separately (do not let asset tooling overwrite `public/manifest.webmanifest`).

## Notes

- Do **not** use `output: 'export'`; API routes require a server.
- `capacitor-www/` is a tiny placeholder; the WebView loads `CAP_SERVER_URL` / `CAP_DEV_URL`.
- Keep `ios/` and `android/` in git; build outputs are gitignored.
