# Apple App Privacy (nutrition labels) · Chain Dials

App Store Connect → App Privacy.

## Data Linked to You

**None.**

## Data Not Linked to You

Typically **None** for v1 if you do not add analytics.

If your host retains standard server access logs (IP, user agent) for the website the WebView loads, Apple usually still treats “no tracking / no account / no analytics SDK” as:

- Tracking: **No**
- Product Interaction / diagnostics collected by you: **No** (unless you add a SDK)

Optional later: if you add crash reporting, declare Diagnostics → Crash Data (not linked).

## Tracking

**No.** We do not use App Tracking Transparency because we do not track across apps/sites for ads.

## Privacy Policy URL (required)

https://chaindials.com/privacy

## Review notes (paste)

```
Chain Dials is a Capacitor shell that loads https://chaindials.com over HTTPS.
No login. No purchases in v1. Live network instruments for BTC / ETH / SOL.
Privacy: https://chaindials.com/privacy
Support: hello@chaindials.com
```
