# Google Play Data Safety · Chain Dials

Use these answers in Play Console → App content → Data safety.

The boards need no account. Accounts are optional and exist for Pro, saved
layouts and synced alert rules, so the app **does** collect data for those who
sign up. Declare it.

## Does your app collect or share user data?

**Yes, collects.** Does not share (Stripe and our hosting are service providers
processing on our behalf, which Play does not count as sharing).

| Data type | Collected | Purpose | Optional | Notes |
|-----------|-----------|---------|----------|-------|
| Personal info → Email address | Yes | Account management | Yes (only if you create an account) | Sign-in identifier |
| Financial info → Purchase history | Yes | Account management, app functionality | Yes | Pro subscription status and Stripe IDs; card data stays with Stripe |
| App activity → Other user-generated content | Yes | App functionality | Yes | Saved layouts, alert rules, wall packs, desks |
| Location, photos, contacts, device IDs | No | | | |
| Analytics / ads SDKs | No | | | |

| Security practice | Answer |
|-------------------|--------|
| Data encrypted in transit | Yes (HTTPS) |
| Users can request deletion | Yes: in app at Account → Delete account, or on the web |
| Independent security review | No |

## Account deletion (required fields)

- In-app path: **Account → Delete account**, confirm with password.
- Web URL for deletion requests: `https://chaindials.com/account`
  (sign in, then Delete account). The privacy policy section "Accounts and
  deleting your data" describes the process and the email fallback.
- What is deleted: sign-in, email, Pro status, saved layouts, alert rules,
  wall packs, desks. Immediately, no retention period.
- What is kept: Stripe's own payment records, as required by law.

## Data that stays on device

Favorites, watchlists and preferences use on-device storage only and are not
declared as collected.

## Data handling overview (short text for the form)

```
Chain Dials works without an account. If you create one, we store your email, Pro subscription status and the layouts and alerts you save, to run those features. Payments are processed by Stripe. We do not sell data or run ads. Delete your account any time from the Account page.
```

## Ads / children

- Ads: **No**
- Designed for children: **No**
- Families policy: not targeting kids
