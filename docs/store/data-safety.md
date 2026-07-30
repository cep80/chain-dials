# Google Play Data Safety · Chain Dials

Use these answers in Play Console → App content → Data safety.

## Does your app collect or share user data?

**No** collected user data that is sent off-device for analytics, ads, or accounts.

Clarify in the form:

| Topic | Answer |
|-------|--------|
| Personal info (name, email, phone) | Not collected |
| Financial info | Not collected (optional Lightning tip goes to a tip destination you configure; we do not process cards in v1) |
| Location | Not collected |
| Photos / files | Not collected |
| App activity / analytics SDKs | Not collected |
| Device IDs for ads | Not collected |
| Data encrypted in transit | Yes (HTTPS) |
| Users can request deletion | N/A (no account); local data cleared by uninstall |
| Independent security review | No |

## Data that stays on device

Favorites and small preferences use on-device storage only. Do **not** declare these as “collected” unless you also transmit them to your servers (we do not).

## Data handling overview (short text for the form)

```
Chain Dials does not require an account and does not sell data. Preferences stay on device. The app fetches public blockchain and market metrics over HTTPS.
```

## Ads / children

- Ads: **No**
- Designed for children: **No**
- Families policy: not targeting kids
