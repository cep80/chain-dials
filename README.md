# Chain Dials

Live network dials for Bitcoin, Ethereum, Solana, and Hyperliquid.

- **Bitcoin** `/btc`: Metronome, Atmosphere, Block Sigil, Issuance Hourglass, Hashrate Forge
- **Ethereum** `/eth`: Slot Lattice, Base Fee Tide, Block Mosaic, Burn Candle, Validator Constellation
- **Solana** `/sol`: Turbine Tach, Priority Jets, Leader Ribbon, Inflation Fountain, Stake Reef
- **Hyperliquid** `/hype`: Clearing Clock, Funding Tide, Hash Tape, Volume Fountain, OI Vault

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run cap:prod` | Sync iOS/Android shells to production HTTPS |
| `npm run android:prod` / `ios:prod` | Sync + open Android Studio / Xcode |

## Mobile & store launch

- Native shells: [docs/MOBILE.md](docs/MOBILE.md)
- Store checklist + signing: [docs/LAUNCH.md](docs/LAUNCH.md)
- Listing / Data Safety / App Privacy copy: [docs/store/](docs/store/)

## Instrument graphics

- Art direction (palette, light rig, shape rules, acceptance views): [docs/instruments/art-direction.md](docs/instruments/art-direction.md)
- Playbook mapping and what was built: [docs/instruments/graphics-playbook.md](docs/instruments/graphics-playbook.md)
- Review harness: `/review/instruments` (noindex, fixture data). Reference captures and the latest review in [docs/instruments/](docs/instruments/).

Privacy: `/privacy` · Terms: `/terms` · Settings: `/settings`

## Configure

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SITE_URL`: production origin (required for OG + store)
- `NEXT_PUBLIC_SUPPORT_EMAIL`: inbox for legal + review
- `NEXT_PUBLIC_LN_ADDRESS`: Lightning Address / LNURL for tips (Bitcoin board)
- `NEXT_PUBLIC_PARTNER_*`: labeled affiliate slot
- `CAP_SERVER_URL`: Capacitor production WebView origin
- Optional `COINGECKO_DEMO_API_KEY` / `COINGECKO_API_KEY` for price history rate limits
- `AUTH_SECRET`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`: accounts and Pro
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`: Pro billing

## Accounts (Supabase)

Accounts, Pro entitlement and saved data live in the Supabase project
`chain-dials`. NextAuth is the session layer; API routes act as the user with
their Supabase token, so row-level security keeps users apart.

- Schema and policies: `supabase/migrations/` (apply with `supabase db push`)
- `profiles` holds entitlement and is read-only to users; only the server's
  secret key writes it. A trigger creates it at sign-up.
- Every user-owned row cascades from `auth.users`, so account deletion removes it all.
- `npm run verify:rls` checks the database refuses anonymous reads and
  self-granted Pro (with `VERIFY_EMAIL` / `VERIFY_PASSWORD` for a test account).

## Stack

- Next.js App Router + TypeScript + Tailwind CSS v4
- Framer Motion + Zustand
- Capacitor 8 (iOS / Android shells)
- Bitcoin: mempool.space REST + WebSocket
- ETH / SOL: public RPCs + CoinGecko (proxied under `/api/suite`)
- Hyperliquid: HyperEVM JSON-RPC tip/fees + `api.hyperliquid.xyz` perp info (funding, OI, volume)
- Accounts: Supabase (Auth + Postgres) behind NextAuth; billing: Stripe
