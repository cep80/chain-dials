# Chain Dials · Store launch

Use with [MOBILE.md](./MOBILE.md). Goal: ship **1.0.0** to App Store + Play Store against production HTTPS.

## Preflight (blockers)

| # | Check | Done when |
|---|--------|-----------|
| 1 | Production site live | `https://chaindials.com` loads boards + `/api/*` |
| 2 | Privacy + Terms live | `/privacy` and `/terms` return 200 |
| 3 | Env on host | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL` set |
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
9. Upload phone + tablet screenshots (see listing doc)
10. Roll out Internal testing → Closed → Production

## iOS (App Store Connect)

1. Apple Developer account + App ID `com.chaindials.app`
2. `npm run ios:prod` on a Mac
3. Xcode → Signing & Capabilities → your Team
4. Product → Archive → Distribute App → App Store Connect
5. Ascryption: **ITSAppUsesNonExemptEncryption = NO** (already in Info.plist)
6. Privacy Policy URL: `https://chaindials.com/privacy`
7. App Privacy nutrition labels: [store/app-privacy.md](./store/app-privacy.md)
8. Screenshots for 6.7" and 6.1" (and iPad if you keep iPad orientations)
9. Review notes: “App loads live network observatory at chaindials.com over HTTPS. No login.”

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

- Wire Digital Asset Links (`public/.well-known/assetlinks.json`) with your Play SHA-256 for verified App Links
- Optional: Apple Associated Domains + `apple-app-site-association`
- Crash reporting only if you accept the privacy update
