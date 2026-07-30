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
