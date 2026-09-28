# Dashboard quality upgrade

The eight improvements from the dashboard assessment are implemented and verified against a production build. Existing uncommitted work was preserved.

| Area | Delivered behavior and evidence |
| --- | --- |
| Watchlists | Editable labels and sort order, balance deltas, reading ages, manual refresh, retained balances on failure, and cross-tab persistence. Browser tests cover storage failure and retry, including an unsaved edit merging with separate changes from another tab on the same chain. Unit tests cover sort modes and capacity. |
| Since last visit | Per-chain baselines and meaningful fee, congestion, wallet, and regime changes with links to the relevant views. Unit tests cover thresholds, missing data, and wallet identity; browser tests cover persistence and ETH-to-SOL navigation. Future-dated baselines are rejected. |
| Freshness | Consistent loading, live, stale, and unavailable states across instruments, modules, regime, prediction comparisons, and forensic watches. Feed-specific ages and errors keep a failed fee or retarget reading stale when other feeds succeed. Reduced-motion and viewport checks pass on all four chains at desktop and mobile sizes. |
| Fetching | Shared in-flight deduplication and cache for Bitcoin REST, wallet/history/suite/alternate-chain data, prediction comparisons, and forensic watches; hidden-tab suspension, backoff, cancellation, and recovery. Alternate-chain snapshots cannot roll back newer tips. Bitcoin REST responses begun before a later WebSocket update cannot replace its fee or block reading; desktop/mobile race tests cover fees. Forensic lookup race tests cover replacing a slow request. |
| Alerts | Configurable Pro thresholds and cooldowns, rule preview, saved trigger history, rearming, repeat suppression, and safe notification failure handling. Account changes isolate history and rules, and same-account tabs synchronize history. Free quiet-tip nudges retain cooldown across reloads and recover from permission/storage failures. API validation and failure tests cover safe rule saves. |
| Charts | Mobile and keyboard inspection, accessible ranges, visible gaps for missing intervals, per-chain saved range/style, and deferred shared forecast requests. Desktop/mobile tests cover keyboard interaction, gaps, and preferences. |
| Performance | Lazy instrument loading and suspension of offscreen animation; measured production baseline and final mobile profile with deterministic fixtures. Results and limits are below and in `docs/performance/`. |
| Browser regression | Deterministic Playwright coverage for all four boards, navigation, lookups and response races, watchlists, filters, CSV download, freshness, charts, alerts, viewport overflow, reduced motion, and hidden-tab behavior. All 60 desktop/mobile cases pass. |

## Verification

- `npm run build`: passed, including TypeScript.
- `npm run lint`: passed.
- `npm test -- --run`: 120 passed across 29 files.
- `npm run test:browser`: 60 passed across desktop and mobile projects, against the production build.
- `npm run test:performance` with `PROFILE_PHASE=final`: passed and refreshed `docs/performance/final.json`.
- Visual review of BTC/HYPE mobile and SOL desktop instrument captures found readable cards and no horizontal overflow. Automated viewport assertions cover all four boards on both sizes.
- `git diff --check`: no whitespace errors; Git only reported line-ending conversion notices on Windows.

## Performance measurement

Both profiles use a production build, Chromium Pixel 7 emulation, four-times CPU slowdown, deterministic API fixtures, a local server, and five-second initial-view and scrolled observation windows. This is a controlled comparison, not a real-device or live-provider benchmark. The scrolled window can still include the bottom instrument in view.

| Measure | Baseline | Final |
| --- | ---: | ---: |
| Ready time | 1,825 ms | 1,993 ms |
| Main-thread task time, initial view | 4,140 ms | 322 ms |
| Main-thread task time, scrolled view | 4,926 ms | 920 ms |
| Decoded script bytes | 1,338,048 | 1,170,749 |
| API requests | 8 | 8 |

Ready time rose 168 ms in this run. Initial-view task time fell about 92%, scrolled task time about 81%, and decoded script bytes about 13%. The request count remained eight, including a shared seven-day history request. Single-run timing can vary with local conditions, so these numbers establish a controlled checkpoint rather than a guarantee for every device.
