# Chain Dials · Store launch

Use with [MOBILE.md](./MOBILE.md). Goal: ship **1.0.0** to App Store + Play Store against production HTTPS.

## Preflight (blockers)

| # | Check | Done when |
|---|--------|-----------|
| 0 | Domain registered | `chaindials.com` resolves (it returned NXDOMAIN from the .com registry on 2026-10-28) and is attached to the Vercel project. Everything below, the native shells and the store URLs depend on it. |
| 1 | Production site live | `https://chaindials.com` loads boards + `/api/*` |
| 2 | Privacy + Terms live | `/privacy` and `/terms` return 200 |
| 3 | Env on host | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL` set |
| 3a | Backend env on host | `AUTH_SECRET`, `CARGOBASE_URL`, `CARGOBASE_ANON_KEY`, `CARGOBASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` set |
| 3b | Health green | `GET /api/health` returns 200 with `backend: "ok"`, `auth_secret: true`, `billing: true` |
| 3c | Stripe webhook | Live-mode endpoint `https://chaindials.com/api/billing/webhook` registered; test checkout flips an account to Pro |
| 3d | Stripe price matches UI | The live `STRIPE_PRICE_ID` charges `PRO_PRICE_USD` from `src/lib/pro.ts` ($3/mo), which is what every Pro label shows |
| 3e | Entitlement locked | `db/migrations/001_lock_profile_entitlement.sql` applied in the CargoBase studio; `VERIFY_EMAIL=… VERIFY_PASSWORD=… npm run verify:rls` passes with a non-Pro account |
| 3f | Live policies on record | Output of `db/export-policies.sql` reconciled with `db/schema.sql` |
| 3g | Account deletion live | CargoBase auth redeployed with `DELETE /v1/user` (cargobase `services/auth/delete_user.go`); deleting a throwaway account from `/account` succeeds and its rows are gone |
| 4 | Native shells synced to prod | `npm run cap:prod` |
| 5 | Icons / splash | `npm run cap:assets` then `cap:prod` |
| 6 | Signing | Apple Team + Android upload keystore |

## Sync production WebView

```bash
npm run cap:prod
# or open IDEs already synced:
npm run android:prod
npm run ios:prod
```

Confirm `ios/App/App/capacitor.config.json` and Android copy show `"url": "https://chaindials.com"` and `"cleartext": false`.

## Android (Play Console)

1. Copy `android/keystore.properties.example` → `android/keystore.properties`, create the `.jks`, fill passwords.
2. `npm run android:prod`
3. Android Studio → Build → Generate Signed Bundle → **release** AAB  
   or `npm run android:bundle` (requires keystore.properties).
4. Play Console → create app → package `com.chaindials.app`
5. Paste listing copy from [store/listing.md](./store/listing.md)
6. Data safety: answers in [store/data-safety.md](./store/data-safety.md)
7. Privacy policy URL: `https://chaindials.com/privacy`
8. Content rating questionnaire (utility / finance informational)
9. Upload phone screenshots and the feature graphic from `docs/store/screenshots/` (regenerate with `npm run build && npm run start`, then `npm run store:screenshots`)
10. Roll out Internal testing → Closed → Production

## iOS (App Store Connect)

1. Apple Developer account + App ID `com.chaindials.app`
2. `npm run ios:prod` on a Mac
3. Xcode → Signing & Capabilities → your Team
4. Product → Archive → Distribute App → App Store Connect
5. Ascryption: **ITSAppUsesNonExemptEncryption = NO** (already in Info.plist)
6. Privacy Policy URL: `https://chaindials.com/privacy`
7. App Privacy nutrition labels: [store/app-privacy.md](./store/app-privacy.md)
8. Screenshots: `docs/store/screenshots/ios-6.9/` (1290×2796, accepted for the 6.9" slot). Add iPad shots only if you keep iPad orientations
9. Review notes: paste from [store/app-privacy.md](./store/app-privacy.md), with a dedicated demo account filled in (Apple requires one because the app has a login)

## Support

- Email: `NEXT_PUBLIC_SUPPORT_EMAIL` (default `hello@chaindials.com`)
- Make sure that inbox exists before review.

## Versioning

| Field | Value |
|-------|-------|
| Marketing / versionName | `1.0.0` |
| Build / versionCode | `1` (bump every upload) |

Bump both before every store upload.

## After first ship

- Wire Digital Asset Links: put your Play App Signing SHA-256 into
  `public/.well-known/assetlinks.json` (file is `[]` until then so crawlers
  do not see a fake fingerprint).
- Optional: Apple Associated Domains + `apple-app-site-association`
- Crash reporting only if you accept the privacy update
- Set `COINGECKO_DEMO_API_KEY` or `COINGECKO_API_KEY` only if you want CoinGecko as a gap-fill (spot and history prefer Coinbase public APIs)
- Set `NEXT_PUBLIC_LN_ADDRESS` when you want the tip jar visible
