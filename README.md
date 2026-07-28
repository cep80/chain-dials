# BTC Dash

A living instrument panel for Bitcoin network health — fundamentals first, charts second.

Live data from [mempool.space](https://mempool.space). Favorites-first layout, sparklines, deltas, block-found moments, Lightning tip jar, partner slot, and Pro teasers.

## Observatory

Five signature instruments (not TradingView clones):

1. **Block Metronome** — radial 10-minute cadence clock
2. **Mempool Atmosphere** — fee-altitude particle weather
3. **Tip Sigil** — generative glyph from the tip hash (click to copy)
4. **Issuance Hourglass** — 21M remaining vs issued + halving neck
5. **Hashrate Forge** — security intensity + difficulty orbit

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

## Configure

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_LN_ADDRESS` — Lightning Address / LNURL for tips
- `NEXT_PUBLIC_PARTNER_*` — labeled affiliate slot

## Stack

- Next.js App Router + TypeScript + Tailwind CSS v4
- Framer Motion
- Zustand
- mempool.space REST + WebSocket

## Product notes

- Free board forever (price, tip, mempool, fees, mining, LN, supply)
- Pro (phase 2): alerts, wall mode, longer history, saved layouts
- Monetization rails in v1: tip jar, partner slot, Pro soft gates
