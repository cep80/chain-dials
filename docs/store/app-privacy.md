# Apple App Privacy (nutrition labels) · Chain Dials

App Store Connect → App Privacy.

The boards need no account, but optional accounts exist (Pro, saved layouts,
synced alerts), so some data is collected and linked to the user.

## Data Linked to You

| Category | Type | Purpose |
|----------|------|---------|
| Contact Info | Email Address | App Functionality (account) |
| Purchases | Purchase History | App Functionality (Pro entitlement) |
| User Content | Other User Content | App Functionality (saved layouts, alert rules, packs, desks) |

## Data Not Linked to You

None. No analytics or crash SDK. If one is added later, declare Diagnostics.

## Tracking

**No.** No App Tracking Transparency prompt: nothing is tracked across apps or
sites.

## Account deletion (Guideline 5.1.1(v))

In app: Account → Delete account, confirmed with the password. Deletes the
account and all saved data immediately and cancels an active subscription.

## Privacy Policy URL (required)

https://chaindials.com/privacy

## Review notes (paste)

Apple requires working demo credentials whenever an app has a login. Create a
dedicated review account before submitting and put its details below; do not
reuse a personal account.

```
Chain Dials is a Capacitor shell that loads https://chaindials.com over HTTPS.
Live network instruments for Bitcoin, Ethereum, Solana and Hyperliquid work without signing in.

Optional account: Account tab. Demo account for review:
  email: <review account email>
  password: <review account password>
Account deletion: Account → Delete account (asks for the password).

Privacy: https://chaindials.com/privacy
Support: hello@chaindials.com
```
